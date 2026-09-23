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

// Bound to one id per call, same as the server route (PATCH /items/:id) -
// callers re-derive it each render from whichever item is currently being
// edited/deleted, same as any other hook argument.
export function useUpdateItem(id: string) {
	return useApiMutation<ItemResponse, Partial<EditableInventoryItem>>({
		url: ITEM_ROUTES.UPDATE(id),
		method: 'PATCH',
	});
}

// Unlike useUpdateItem, the target id is passed at call time (via `mutate`)
// rather than baked into the hook call - for callers that don't have one
// single "currently editing" id to bind up front, e.g. a per-cell field edit
// that can target any row in the grid without re-rendering first.
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

// Same "id passed at call time" shape as useUpdateAnyItem, for the same
// reason: a row's delete button lives in the grid without ever "opening"
// that row first, so there's no single bound id to build the hook around.
export function useDeleteAnyItem() {
	return useMutation<{ success: boolean }, ApiError, string>({
		mutationFn: (id) =>
			apiFetch<{ success: boolean }>(ITEM_ROUTES.UPDATE(id), {
				method: 'DELETE',
			}),
	});
}
