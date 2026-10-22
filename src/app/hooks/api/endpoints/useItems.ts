import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useApiMutation from '../core/useApiMutation';
import { apiFetch } from '../core/api-client';
import type { ApiError } from '../core/api-client';
import { ITEM_ROUTES } from '../../../constants/routes.constant';
import type { EditableInventoryItem, InventoryItemRecord } from '../../../types';
import { useSiteStatus } from './useSiteStatus';
import logger from '../../../util/logger';
import env from '../../../config/env';

const log = logger.child({ hook: 'useItems' });
const cacheTimestamp = (timestamp: number | undefined) => timestamp ? new Date(timestamp).toISOString() : null;

// _id isn't on InventoryItemRecord (that type also covers the static
// snapshot, which has no DB row behind it) - items from this endpoint
// always have one.
export type ItemDto = InventoryItemRecord & { _id: string; version: number };

// Written by server/local/exportItemsSnapshot.ts into public/.
export type ItemsSnapshot = {
	exportedAt: string;
	items: InventoryItemRecord[];
};

const ITEMS_SNAPSHOT_URL = `${import.meta.env.BASE_URL}items-snapshot.json`;

export type ItemsData = {
	// Global version the list is current as of.
	version: number;
	items: ItemDto[];
};

type ItemChangesResponse =
	| { full: true; version: number; items: ItemDto[] }
	| { full: false; version: number; updated: ItemDto[]; deleted: string[] };

export type ItemResponse = {
	item: ItemDto;
};

const ITEMS_QUERY_KEY = ['items'] as const;

function applyItemChanges(
	previous: ItemsData,
	changes: ItemChangesResponse,
): ItemsData {
	if (changes.full) {
		return { version: changes.version, items: changes.items };
	}
	if (changes.updated.length === 0 && changes.deleted.length === 0) {
		return { ...previous, version: changes.version };
	}

	const deleted = new Set(changes.deleted);
	const updated = new Map(changes.updated.map((item) => [item._id, item]));
	const items = previous.items
		.filter((item) => !deleted.has(item._id))
		.map((item) => {
			const next = updated.get(item._id);
			updated.delete(item._id);
			return next ?? item;
		});
	// Whatever's left in `updated` was created since the last sync.
	items.push(...updated.values());
	return { version: changes.version, items };
}

/**
 * The full list is fetched once; after that, a refetch asks only for what
 * changed since the cached version and merges it in. Refetches are driven
 * by useSiteStatus's poll (the version moved) or by an admin mutation
 * invalidating ['items'] - never by staleness, hence staleTime: Infinity.
 */
export function useGetItems() {
	const queryClient = useQueryClient();
	const query = useQuery<ItemsData, ApiError>({
		queryKey: ITEMS_QUERY_KEY,
		queryFn: async () => {
			const cached = queryClient.getQueryData<ItemsData>(ITEMS_QUERY_KEY);
			const cachedAt = queryClient.getQueryState(ITEMS_QUERY_KEY)?.dataUpdatedAt;
			// Version zero can survive an out-of-process seed. An empty cache
			// must recover through the full endpoint, not an empty since=0 delta.
			if (!cached || cached.items.length === 0) {
				log.info({ source: 'api-full-list', url: `${env.VITE_GATEWAY_URL}${ITEM_ROUTES.LIST}`, reason: cached ? 'empty-cache-recovery' : 'no-frontend-cache', previousCachedAt: cacheTimestamp(cachedAt) }, 'Fetching full item list');
				const { version, items } = await apiFetch<ItemsData>(ITEM_ROUTES.LIST);
				log.info({ source: 'api-full-list', version, count: items.length, receivedAt: new Date().toISOString() }, 'Full item list received');
				if (items.length === 0) log.warn({ version, url: `${env.VITE_GATEWAY_URL}${ITEM_ROUTES.LIST}` }, 'API returned an empty item list; snapshot fallback is not used for successful empty responses');
				return { version, items };
			}
			log.info({ source: 'api-delta', url: `${env.VITE_GATEWAY_URL}${ITEM_ROUTES.CHANGES}`, since: cached.version, cachedCount: cached.items.length, cachedAt: cacheTimestamp(cachedAt) }, 'Fetching item changes');
			const changes = await apiFetch<ItemChangesResponse>(ITEM_ROUTES.CHANGES, {
				params: { since: cached.version },
			});
			const next = applyItemChanges(cached, changes);
			log.info({ source: changes.full ? 'api-full-reset' : 'api-delta-merge', version: next.version, count: next.items.length, ...(!changes.full ? { updated: changes.updated.length, deleted: changes.deleted.length } : {}) }, 'Item changes applied to frontend cache');
			return next;
		},
		staleTime: Infinity,
	});

	const { data: status, dataUpdatedAt: statusUpdatedAt } = useSiteStatus();
	const { data, dataUpdatedAt, errorUpdatedAt, isFetching, refetch } = query;
	useEffect(() => {
		if (!data) return;
		log.info({ source: 'frontend-query-cache', count: data.items.length, version: data.version, cachedAt: cacheTimestamp(dataUpdatedAt), cacheAgeMs: Date.now() - dataUpdatedAt }, 'Serving items from React Query cache');
	}, [data, dataUpdatedAt]);
	useEffect(() => {
		if (query.error) log.warn({ source: 'api-error', error: query.error, servingCachedItems: Boolean(data), cachedAt: cacheTimestamp(dataUpdatedAt) }, 'Item request failed');
	}, [query.error, errorUpdatedAt, data, dataUpdatedAt]);

	// Only reacts to a status newer than our last attempt, so a version that
	// stays different (e.g. a write landed between poll and fetch) can't loop.
	useEffect(() => {
		if (!status || isFetching) return;
		if (statusUpdatedAt <= Math.max(dataUpdatedAt, errorUpdatedAt)) return;
		if (data?.version === status.version && data.items.length > 0) return;
		log.info({ source: 'site-status-poll', cachedVersion: data?.version, serverVersion: status.version, cachedCount: data?.items.length ?? 0, reason: data?.items.length === 0 ? 'empty-cache-recovery' : 'version-changed' }, 'Refreshing item data');
		void refetch();
	}, [
		status,
		statusUpdatedAt,
		data?.version,
		data?.items.length,
		dataUpdatedAt,
		errorUpdatedAt,
		isFetching,
		refetch,
	]);

	return query;
}

/**
 * The last exported copy of the item list, served from the frontend's own
 * host - stale, but still something to show while GET /items is down.
 * Fetched only when `enabled`, so a healthy visit never downloads it.
 */
export function useItemsSnapshot(enabled: boolean) {
	const query = useQuery<ItemsSnapshot>({
		queryKey: ['itemsSnapshot'],
		queryFn: async () => {
			log.warn({ source: 'static-snapshot', url: ITEMS_SNAPSHOT_URL }, 'Loading snapshot fallback after live item request failure');
			const response = await fetch(ITEMS_SNAPSHOT_URL);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const snapshot = await response.json() as ItemsSnapshot;
			log.info({ source: 'static-snapshot', count: snapshot.items.length, exportedAt: snapshot.exportedAt, receivedAt: new Date().toISOString() }, 'Snapshot fallback received');
			return snapshot;
		},
		enabled,
		staleTime: Infinity,
	});
	useEffect(() => {
		if (enabled && query.data) log.warn({ source: 'snapshot-query-cache', count: query.data.items.length, exportedAt: query.data.exportedAt, cachedAt: cacheTimestamp(query.dataUpdatedAt) }, 'Serving cached snapshot fallback');
	}, [enabled, query.data, query.dataUpdatedAt]);
	useEffect(() => {
		if (enabled && query.error) log.error({ source: 'static-snapshot', err: query.error }, 'Snapshot fallback request failed');
	}, [enabled, query.error]);
	return query;
}

export function useCreateItem() {
	return useApiMutation<ItemResponse, Partial<EditableInventoryItem>>({
		url: ITEM_ROUTES.LIST,
		method: 'POST',
	});
}

// Item mutations come in two shapes: bound to one id per call, when there's a
// single "currently editing" item to re-derive it from each render
// (useUpdateItem, matching the server's PATCH /items/:id) - or with the id
// passed at mutate()-call time instead, for a per-cell/per-row grid action
// that never "opens" a row first and so has no such id to bind up front
// (useUpdateAnyItem, useDeleteAnyItem below).
export function useUpdateItem(id: string) {
	return useApiMutation<ItemResponse, Partial<EditableInventoryItem>>({
		url: ITEM_ROUTES.UPDATE(id),
		method: 'PATCH',
	});
}

export function useUpdateAnyItem() {
	return useMutation<
		ItemResponse,
		ApiError,
		{ id: string; fields: Partial<EditableInventoryItem> }
	>({
		mutationFn: ({ id, fields }) =>
			apiFetch<ItemResponse>(ITEM_ROUTES.UPDATE(id), {
				method: 'PATCH',
				body: fields,
			}),
	});
}

export function useDeleteAnyItem() {
	return useMutation<{ success: boolean }, ApiError, string>({
		mutationFn: (id) =>
			apiFetch<{ success: boolean }>(ITEM_ROUTES.UPDATE(id), {
				method: 'DELETE',
			}),
	});
}

export type BulkUpdateItemsResponse = {
	success: boolean;
	matchedCount: number;
	modifiedCount: number;
};

export type BulkDeleteItemsResponse = { success: boolean; matchedCount: number; deletedCount: number; deletedIds: string[]; version: number };

export function useBulkDeleteItems() {
	const queryClient = useQueryClient();
	return useMutation<BulkDeleteItemsResponse, ApiError, { ids: string[] }>({
		onMutate: async () => { await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEY }); },
		mutationFn: ({ ids }) => apiFetch<BulkDeleteItemsResponse>(ITEM_ROUTES.BULK_DELETE, {
			method: 'DELETE',
			body: { ids },
		}),
		onSuccess: async (result) => {
			await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEY });
			const deleted = new Set(result.deletedIds);
			queryClient.setQueryData<ItemsData>(ITEMS_QUERY_KEY, (previous) => previous ? {
				...previous, items: previous.items.filter((item) => !deleted.has(item._id)),
			} : previous);
			// Keep the prior sync cursor: the next delta request must still merge
			// unrelated writes that happened before this deletion's version.
			await queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}

// One request setting the same fields on every id, instead of BulkEditPanel's
// old N-requests-via-Promise.allSettled approach - the server does it as a
// single updateMany.
export function useBulkUpdateItems() {
	return useMutation<
		BulkUpdateItemsResponse,
		ApiError,
		{ ids: string[]; fields: Partial<EditableInventoryItem>; ruleOverrideRevision?: number }
	>({
		mutationFn: ({ ids, fields, ruleOverrideRevision }) =>
			apiFetch<BulkUpdateItemsResponse>(ITEM_ROUTES.BULK_UPDATE, {
				method: 'PATCH',
				body: { ids, fields, ruleOverrideRevision },
			}),
	});
}
