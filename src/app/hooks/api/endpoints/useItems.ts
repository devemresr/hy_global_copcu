import useApiQuery from '../core/useApiQuery';
import useApiMutation from '../core/useApiMutation';
import { ITEM_ROUTES } from '../../../constants/routes.constant';
import type { EditableInventoryItem, InventoryItemRecord } from '../../../types';

// _id isn't on InventoryItemRecord (that type also covers the bundled
// static dataset, which has no DB row behind it) - items from this endpoint
// always have one.
export type ItemDto = InventoryItemRecord & { _id: string };

type ItemsResponse = {
	items: ItemDto[];
};

type ItemResponse = {
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

export function useDeleteItem(id: string) {
	return useApiMutation<{ success: boolean }, void>({
		url: ITEM_ROUTES.UPDATE(id),
		method: 'DELETE',
	});
}
