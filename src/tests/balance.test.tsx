import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BalancePage from '../app/Balance';
import { jsonResponse } from './helpers';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, client: QueryClient, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
});
it('records a non-stock expense using a custom subtype and reuses report filters without a dealer search', async () => {
	const categories = [
		{ _id: 'system:other', group: 'other', name: 'Genel gider' },
	];
	const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
		const { pathname } = new URL(url);
		if (pathname === '/finance/categories') {
			const input = JSON.parse(init.body as string);
			const category = {
				_id: input.requestId,
				group: input.group,
				name: input.name,
			};
			categories.push(category);
			return jsonResponse(201, { category });
		}
		if (pathname === '/finance/entries')
			return jsonResponse(201, { entry: {} });
		if (pathname !== '/finance')
			throw new Error(`Unexpected request: ${pathname}`);
		return jsonResponse(200, {
			categories,
			entries: [],
			count: 0,
			totalPages: 1,
			balance: 1000,
			expenses: 0,
			income: 1000,
			net: 1000,
			openingBalance: 0,
			closingBalance: 1000,
		});
	});
	vi.stubGlobal('fetch', fetchMock);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root.render(
			<QueryClientProvider client={client}>
				<MemoryRouter>
					<BalancePage />
				</MemoryRouter>
			</QueryClientProvider>,
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	const type = (node: HTMLInputElement, value: string) =>
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(node, value);
			node.dispatchEvent(new Event('input', { bubbles: true }));
		});
	expect(container.querySelector('#order-filter-bayi')).toBeNull();
	expect(container.textContent).toContain('Genel bakiye');
	const forms = container.querySelectorAll('form');
	type(forms[1].querySelector('input')!, 'Nakliye');
	await act(async () =>
		forms[1].dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	type(container.querySelector<HTMLInputElement>('#finance-amount')!, '125.50');
	await act(async () =>
		forms[0].dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	const call = fetchMock.mock.calls.find(
		([url]) => new URL(url).pathname === '/finance/entries',
	)!;
	const input = JSON.parse(call[1]!.body as string);
	expect(input.amount).toBe(125.5);
	expect(
		categories.find((category) => category._id === input.categoryId)?.name,
	).toBe('Nakliye');
	expect(
		fetchMock.mock.calls.every(([url]) =>
			new URL(url).pathname.startsWith('/finance'),
		),
	).toBe(true);
});
