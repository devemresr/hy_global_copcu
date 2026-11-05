import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ColDef } from 'ag-grid-community';
import OrdersPage from '../app/Orders';
import type { Order } from '../app/hooks/api/endpoints/useOrders';
import { ORDER_ROUTES, BAYI_ROUTES } from '../app/constants/routes.constant';
import { mockFetch, jsonResponse } from './helpers';

vi.mock('../app/component/InventoryDataGrid', () => ({
	InventoryDataGrid: ({
		rowData,
		columnDefs,
	}: {
		rowData: Order[];
		columnDefs: ColDef[];
	}) => (
		<div>
			{rowData.map((data) => (
				<div key={data._id}>
					{columnDefs
						.filter((column) => column.cellRenderer)
						.map((column) =>
							createElement(
								column.cellRenderer as ComponentType<{ data: Order }>,
								{ key: column.colId, data },
							),
						)}
				</div>
			))}
		</div>
	),
}));
vi.mock('../app/component/admin/OrderCharts', () => ({
	OrderCharts: ({ data }: { data: { summary: { count: number } } }) => (
		<p data-testid='report-count'>{data.summary.count}</p>
	),
}));
vi.mock('../app/component/admin/CreatedOrderPdfModal', () => ({
	CreatedOrderPdfModal: ({ order, mode }: { order: Order; mode: string }) => (
		<div role='dialog'>
			{mode}: {order.name}
		</div>
	),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
let client: QueryClient;
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
});
const orders = [1, 2].map(
	(index): Order => ({
		_id: String(index).padStart(24, '0'),
		name: `Order ${index}`,
		createdAt: '2026-11-04T12:00:00Z',
		total: 100,
		quantity: 1,
		lines: [
			{ type: 'EMMC', memoryGb: 8, quantity: 1, unitPrice: 100, total: 100 },
		],
	}),
);
const report = {
	orders: [orders[0]],
	timeline: orders,
	summary: { count: 2, total: 200, quantity: 2 },
	daily: [],
	byType: [],
	byMemory: [],
	page: 1,
	totalPages: 2,
};

describe('order report selection', () => {
	it('checks filtered orders by default, excludes a row from the report, and opens its own PDF', async () => {
		const fetchMock = mockFetch({
			[BAYI_ROUTES.LIST]: () => jsonResponse(200, { bayiler: [] }),
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, report),
			[ORDER_ROUTES.REPORT]: () =>
				jsonResponse(200, {
					...report,
					orders: [orders[1]],
					timeline: [orders[1]],
					summary: { count: 1, total: 100, quantity: 1 },
				}),
		});
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		await act(async () => {
			root!.render(
				<QueryClientProvider client={client}>
					<MemoryRouter>
						<OrdersPage />
					</MemoryRouter>
				</QueryClientProvider>,
			);
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		await act(async () => {
			const details = container.querySelector<HTMLDetailsElement>(
				'details[aria-labelledby=order-history]',
			)!;
			details.open = true;
			details.dispatchEvent(new Event('toggle'));
		});
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		const checkbox = container.querySelector<HTMLInputElement>(
			'input[aria-label="Order 1 rapora dahil et"]',
		)!;
		expect(checkbox.checked).toBe(true);
		await act(async () => checkbox.click());
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		const selectionRequest = fetchMock.mock.calls.find(
			([url]) => new URL(url).pathname === ORDER_ROUTES.REPORT,
		)!;
		expect(JSON.parse(selectionRequest[1]!.body as string).excludeIds).toBe(
			orders[0]._id,
		);
		expect(
			container.querySelector('[data-testid=report-count]')?.textContent,
		).toBe('1');
		act(() =>
			container
				.querySelector<HTMLButtonElement>(
					'button[aria-label="Order 1 PDF indir"]',
				)!
				.click(),
		);
		expect(container.querySelector('[role=dialog]')?.textContent).toBe(
			'existing: Order 1',
		);
	});
});
