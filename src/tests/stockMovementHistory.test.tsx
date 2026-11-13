import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { StockMovementHistory } from '../app/component/admin/StockMovementHistory';
import type {
	StockResponse,
	StockMovement,
} from '../app/hooks/api/endpoints/useStock';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
});
it('nests purchases and sales under their Istanbul day and shows supplier source links with full-day totals', () => {
	const source = '000000000000000000000081';
	const row: StockMovement = {
		id: 'sale:0',
		operationId: 'sale',
		kind: 'partial',
		createdAt: '2026-11-10T22:30:00Z',
		bayiName: null,
		type: 'EMMC',
		memoryGb: 8,
		quantityUnit: 'piece',
		quantity: 2,
		purchaseCost: 20,
		revenue: 30,
		profit: 10,
		orderId: null,
		suppliers: [
			{
				bayiId: 'a',
				bayiName: 'Store A',
				quantity: 2,
				revenue: 30,
				costOfGoods: 20,
				sourcePurchases: [
					{ orderId: source, lotId: source + ':0', quantity: 2 },
				],
			},
		],
	};
	const data: StockResponse = {
		positions: [],
		lots: [],
		lotCount: 0,
		totalPages: 1,
		page: 1,
		profits: [],
		profitsByMemory: [],
		operations: [],
		movementCount: 0,
		movementPages: 1,
		reportTotals: { purchaseCost: 0, revenue: 0, profit: 0 },
		movements: [],
		activities: [
			{
				id: 'sale',
				kind: 'partial',
				createdAt: row.createdAt,
				date: '2026-11-11',
				lines: [
					row,
					{ ...row, id: 'sale:1', type: 'EMCP', memoryGb: 16, suppliers: [] },
				],
			},
		],
		activityCount: 7,
		activityPages: 2,
		dailyMovementTotals: [
			{
				date: '2026-11-11',
				count: 7,
				purchaseCost: 100,
				costOfGoods: 60,
				revenue: 200,
				profit: 140,
			},
		],
	};
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root.render(
			<MemoryRouter>
				<StockMovementHistory
					data={data}
					page={1}
					pageSize={1}
					onPageChange={vi.fn()}
					onPageSizeChange={vi.fn()}
				/>
			</MemoryRouter>,
		),
	);
	const day = container.querySelector('details')!;
	expect(day.open).toBe(true);
	expect(day.querySelector('summary')!.textContent).toContain('11 Kasım 2026');
	expect(day.querySelector('summary')!.textContent).toContain('7 işlem');
	expect(day.querySelector('summary')!.textContent).toContain('200,00');
	const sale = day.querySelector('details')!;
	expect(sale.open).toBe(false);
	expect(sale.querySelector('summary')!.textContent).toContain('2 ürün satırı');
	expect(sale.textContent).toContain('Bayi: Store A');
	expect(sale.querySelector('a')!.getAttribute('href')).toContain(
		'preset=purchases&purchaseId=' + source,
	);
	expect(sale.querySelector('a')!.textContent).toContain('2 adet');
});
