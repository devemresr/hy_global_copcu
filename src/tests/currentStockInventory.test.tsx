import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CurrentStockInventory } from '../app/component/admin/CurrentStockInventory';
import type { InventoryDataGrid } from '../app/component/InventoryDataGrid';
import type { StockPosition } from '../app/hooks/api/endpoints/useStock';

const grid = vi.hoisted(() => ({
	props: undefined as ComponentProps<typeof InventoryDataGrid> | undefined,
}));
vi.mock('../app/component/InventoryDataGrid', () => ({
	InventoryDataGrid: (props: ComponentProps<typeof InventoryDataGrid>) => {
		grid.props = props;
		return <div data-testid='stock-grid' />;
	},
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	grid.props = undefined;
});
const positions: StockPosition[] = [
	{
		key: 'EMMC:16:piece',
		type: 'EMMC',
		memoryGb: 16,
		quantityUnit: 'piece',
		quantity: 5,
		averagePurchaseCost: 10,
		averageSellingPrice: 12,
		listPurchasePrices: [
			{ currency: 'TRY', unitPrice: 9, hasExceptions: false },
			{ currency: 'USD', unitPrice: 1, hasExceptions: true },
		],
	},
	{
		key: 'IPHONE:-:kg',
		type: 'IPHONE',
		memoryGb: null,
		quantityUnit: 'kg',
		quantity: 2,
		averagePurchaseCost: 50,
		averageSellingPrice: null,
		listPurchasePrices: [],
	},
];
function mount(rows = positions) {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root.render(
			<MemoryRouter>
				<CurrentStockInventory positions={rows} />
			</MemoryRouter>,
		),
	);
}
function choose(label: string) {
	act(() =>
		[
			...container.querySelectorAll<HTMLButtonElement>(
				'[aria-label="Stok görünümü"] button',
			),
		]
			.find((b) => b.textContent === label)!
			.click(),
	);
}
it('keeps blocks on the left and a table on the right and supplies real numeric filters for prices and quantities', () => {
	mount();
	expect(
		[...container.querySelectorAll('[aria-label="Stok görünümü"] button')].map(
			(b) => b.textContent,
		),
	).toEqual(['Blok', 'Tablo']);
	expect(grid.props).toBeUndefined();
	choose('Tablo');
	const columns = grid.props!.columnDefs;
	for (const key of [
		'memoryGb',
		'quantity',
		'averagePurchaseCost',
		'averageSellingPrice',
		'stockCost',
		'listPrice-TRY',
		'listPrice-USD',
	]) {
		const col = columns.find((c) => (c.colId ?? c.field) === key)!;
		expect(col.filter).toBe('agNumberColumnFilter');
		expect(col.floatingFilter).toBe(true);
	}
	const quote = columns.find((c) => c.colId === 'listPrice-USD')!;
	expect(typeof quote.valueGetter).toBe('function');
	if (typeof quote.valueGetter === 'function') {
		expect(quote.valueGetter({ data: positions[0] } as never)).toBe(1);
		expect(quote.valueGetter({ data: positions[1] } as never)).toBeNull();
	}
	expect(grid.props!.rowData).toHaveLength(2);
});
it('reflects filtered grid rows in the totals, clears column filters, and restores filters after changing views', () => {
	mount();
	choose('Tablo');
	const setFilterModel = vi.fn();
	act(() => {
		grid.props!.onStateUpdated!({
			state: {
				filter: {
					filterModel: {
						quantity: { filterType: 'number', type: 'greaterThan', filter: 3 },
					},
				},
			},
		} as never);
		grid.props!.onModelUpdated!({
			api: {
				setFilterModel,
				forEachNodeAfterFilterAndSort: (
					visit: (node: { data: StockPosition }) => void,
				) => visit({ data: positions[0] }),
			},
		} as never);
	});
	expect(
		container.querySelector('[aria-label="Ürün türü stok toplamları"]')!
			.textContent,
	).toContain('eMMC');
	expect(
		container.querySelector('[aria-label="Ürün türü stok toplamları"]')!
			.textContent,
	).not.toContain('iPhone');
	expect(container.querySelector('[role="status"]')!.textContent).toContain(
		'1 ürün kaydı · 1 sütun filtresi etkin',
	);
	act(() =>
		[...container.querySelectorAll('button')]
			.find((b) => b.textContent === 'Tablo filtrelerini temizle')!
			.click(),
	);
	expect(setFilterModel).toHaveBeenCalledWith(null);
	choose('Blok');
	expect(container.querySelectorAll('h4')).toHaveLength(2);
	choose('Tablo');
	expect(grid.props!.initialState?.filter?.filterModel).toMatchObject({
		quantity: { filter: 3 },
	});
});
it('distinguishes zero stock from unknown purchase costs and retains separate weight and piece quantities', () => {
	mount([
		{ ...positions[0], quantity: 0, averagePurchaseCost: null },
		positions[1],
	]);
	expect(container.textContent).toContain('Stok yok');
	expect(container.textContent).toContain('0 adet');
	expect(container.textContent).toContain('2 kg');
	choose('Tablo');
	const total = grid.props!.columnDefs.find((c) => c.colId === 'stockCost')!;
	if (typeof total.valueGetter !== 'function')
		throw new Error('Numeric total getter is missing');
	expect(
		total.valueGetter({
			data: { ...positions[0], quantity: 0, averagePurchaseCost: null },
		} as never),
	).toBe(0);
	expect(
		total.valueGetter({
			data: { ...positions[0], averagePurchaseCost: null },
		} as never),
	).toBeNull();
});

it('explains the weighted selling average and opens and focuses the report filters', () => {
	mount();
	const panel = document.createElement('details');
	panel.id = 'stock-report-filters';
	panel.innerHTML = '<summary tabindex="0">Report filters</summary>';
	panel.scrollIntoView = vi.fn();
	document.body.append(panel);
	try {
		const button = container.querySelector<HTMLButtonElement>(
			'[aria-label="Ortalama gerçek satış fiyatı hakkında"]',
		)!;
		act(() => button.click());
		const info = document.querySelector(
			'[role="dialog"][aria-label="Satış ortalaması bilgisi"]',
		)!;
		expect(info.textContent).toContain(
			'toplam tutarı, toplam satış miktarına bölünür',
		);
		act(() => info.querySelector<HTMLAnchorElement>('a')!.click());
		expect(panel.open).toBe(true);
		expect(document.activeElement).toBe(panel.querySelector('summary'));
		expect(panel.scrollIntoView).toHaveBeenCalled();
		expect(button.getAttribute('aria-expanded')).toBe('false');
	} finally {
		panel.remove();
	}
});
