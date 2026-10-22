import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetItems } from '../app/hooks/api/endpoints/useItems';
import { apiFetch } from '../app/hooks/api/core/api-client';

const statusState = vi.hoisted(() => ({ updatedAt: 0 }));
vi.mock('../app/hooks/api/endpoints/useSiteStatus', () => ({ useSiteStatus: () => ({ data: { version: 0 }, dataUpdatedAt: statusState.updatedAt }) }));
vi.mock('../app/hooks/api/core/api-client', () => ({ apiFetch: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
let client: QueryClient;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; container?.remove(); client?.clear(); vi.clearAllMocks(); });

describe('empty item cache recovery', () => {
	it('refetches the full list when the status version still equals an empty cached version', async () => {
		client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		client.setQueryData(['items'], { version: 0, items: [] }, { updatedAt: Date.now() - 1000 });
		statusState.updatedAt = Date.now();
		vi.mocked(apiFetch).mockResolvedValue({ version: 0, items: [{ _id: 'seeded', version: 0, model: 'SEEDED', depolamaBirimi: 'GB', fiyat: 150, paraBirimi: 'TRY' }] });
		container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
		function Harness() { const query = useGetItems(); return createElement('span', null, query.data?.items.length ?? 0); }
		await act(async () => { root!.render(createElement(QueryClientProvider, { client }, createElement(Harness))); });
		await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/items'));
		expect(client.getQueryData<{ items: unknown[] }>(['items'])!.items).toHaveLength(1);
	});
});
