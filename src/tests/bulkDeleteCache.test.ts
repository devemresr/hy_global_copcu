import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiFetch } from '../app/hooks/api/core/api-client';
import { useBulkDeleteItems, type ItemsData } from '../app/hooks/api/endpoints/useItems';

vi.mock('../app/hooks/api/core/api-client', () => ({ apiFetch: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.clearAllMocks());

it('removes confirmed deletions immediately without skipping intervening sync versions', async () => {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const items = ['deleted', 'retained'].map((_id) => ({ _id, model: _id, version: 2, bellekTipi: 'UFS', depolamaBirimi: 'GB' as const, fiyat: 10, paraBirimi: 'TRY' as const }));
	client.setQueryData<ItemsData>(['items'], { version: 2, items });
	vi.mocked(apiFetch).mockResolvedValue({ success: true, matchedCount: 1, deletedCount: 1, deletedIds: ['deleted'], version: 5 });
	const invalidation = vi.spyOn(client, 'invalidateQueries');
	const container = document.createElement('div');
	const root = createRoot(container);
	let mutation: ReturnType<typeof useBulkDeleteItems>;
	function Harness() { mutation = useBulkDeleteItems(); return null; }
	try {
		act(() => root.render(createElement(QueryClientProvider, { client }, createElement(Harness))));
		await act(async () => { await mutation.mutateAsync({ ids: ['deleted', 'retained'] }); });
		expect(client.getQueryData<ItemsData>(['items'])).toEqual({ version: 2, items: [items[1]] });
		expect(invalidation).toHaveBeenCalledWith({ queryKey: ['items'] });
	} finally {
		act(() => root.unmount());
		client.clear();
	}
});
