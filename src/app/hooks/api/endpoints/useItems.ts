import { useMutation } from '@tanstack/react-query';
import useApiQuery from '../core/useApiQuery';
import useApiMutation from '../core/useApiMutation';
import { apiFetch } from '../core/api-client';
import type { ApiError } from '../core/api-client';
import { ITEM_ROUTES } from '../../../constants/routes.constant';
import type { EditableInventoryItem, InventoryItemRecord } from '../../../types';

// _id isn't on InventoryItemRecord (that type also covers the bundled
// static dataset, which has no DB row behind it) - items from this endpoint
// always have one.
export type ItemDto = InventoryItemRecord & { _id: string };

type ItemsResponse = {
	items: ItemDto[];
};

export type ItemResponse = {
	item: ItemDto;
};

export function useGetItems() {
	return useApiQuery<ItemsResponse>({
		url: ITEM_ROUTES.LIST,
		queryKey: ['items'],
	});
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
