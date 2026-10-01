import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useApiMutation from '../core/useApiMutation';
import { apiFetch } from '../core/api-client';
import type { ApiError } from '../core/api-client';
import { ITEM_ROUTES } from '../../../constants/routes.constant';
import type { EditableInventoryItem, InventoryItemRecord } from '../../../types';
import { useSiteStatus } from './useSiteStatus';

// _id isn't on InventoryItemRecord (that type also covers the bundled
// static dataset, which has no DB row behind it) - items from this endpoint
// always have one.
export type ItemDto = InventoryItemRecord & { _id: string; version: number };

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
			if (!cached) {
				const { version, items } = await apiFetch<ItemsData>(ITEM_ROUTES.LIST);
				return { version, items };
			}
			const changes = await apiFetch<ItemChangesResponse>(ITEM_ROUTES.CHANGES, {
				params: { since: cached.version },
			});
			return applyItemChanges(cached, changes);
		},
		staleTime: Infinity,
	});

	const { data: status, dataUpdatedAt: statusUpdatedAt } = useSiteStatus();
	const { data, dataUpdatedAt, errorUpdatedAt, isFetching, refetch } = query;

	// Only reacts to a status newer than our last attempt, so a version that
	// stays different (e.g. a write landed between poll and fetch) can't loop.
	useEffect(() => {
		if (!status || isFetching) return;
		if (statusUpdatedAt <= Math.max(dataUpdatedAt, errorUpdatedAt)) return;
		if (data?.version === status.version) return;
		void refetch();
	}, [
		status,
		statusUpdatedAt,
		data?.version,
		dataUpdatedAt,
		errorUpdatedAt,
		isFetching,
		refetch,
	]);

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

// One request setting the same fields on every id, instead of BulkEditPanel's
// old N-requests-via-Promise.allSettled approach - the server does it as a
// single updateMany.
export function useBulkUpdateItems() {
	return useMutation<
		BulkUpdateItemsResponse,
		ApiError,
		{ ids: string[]; fields: Partial<EditableInventoryItem> }
	>({
		mutationFn: ({ ids, fields }) =>
			apiFetch<BulkUpdateItemsResponse>(ITEM_ROUTES.BULK_UPDATE, {
				method: 'PATCH',
				body: { ids, fields },
			}),
	});
}
