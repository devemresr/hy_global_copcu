vi.mock('../app/hooks/api/endpoints/useBayiler', () => ({
	useBayiler: () => ({ data: { bayiler: [] }, isError: false }),
}));
import { afterEach, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StockSaleForm } from '../app/component/admin/StockSaleForm';
import type { StockPosition } from '../app/hooks/api/endpoints/useStock';
const save = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('../app/hooks/api/endpoints/useStock', () => ({
	useRecordStockSale: () => ({ mutateAsync: save, isPending: false }),
}));
vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const a = '000000000000000000000001',
	b = '000000000000000000000002';
const positions: StockPosition[] = [
	{
		key: 'EMCP:8:piece',
		type: 'EMCP',
		memoryGb: 8,
		quantityUnit: 'piece',
		quantity: 40,
		averagePurchaseCost: 150,
		averageSellingPrice: null,
		listPurchasePrices: [],
		suppliers: [
			{ bayiId: a, bayiName: 'A', quantity: 30 },
			{ bayiId: b, bayiName: 'B', quantity: 10 },
		],
	},
];
let root: Root, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	save.mockClear();
	localStorage.clear();
});
function mount() {
	localStorage.clear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root.render(<StockSaleForm positions={positions} onSaved={() => {}} />),
	);
}
function input(label: string, value: string) {
	act(() => {
		const node = container.querySelector<HTMLInputElement>(
			'[aria-label="' + label + '"]',
		)!;
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			'value',
		)!.set!.call(node, value);
		node.dispatchEvent(new Event('input', { bubbles: true }));
	});
}
function select(label: string, value: string) {
	const node = container.querySelector<HTMLElement>(
		'[aria-label="' + label + '"]',
	)!;
	if (node instanceof HTMLSelectElement) {
		act(() => {
			node.value = value;
			node.dispatchEvent(new Event('change', { bubbles: true }));
		});
		return;
	}
	act(() => node.click());
	const name = value === a ? 'A' : 'B';
	act(() =>
		[...document.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]')]
			.find((option) => option.textContent?.startsWith(name + ' ('))!
			.click(),
	);
}
function addFromSupplier(name: string) {
	act(() =>
		container
			.querySelector<HTMLButtonElement>('[aria-label="1. satır stok kaynağı"]')!
			.click(),
	);
	act(() =>
		[...document.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
			.find((option) => option.textContent === 'Başka bayiden sat')!
			.click(),
	);
	act(() =>
		[
			...document.querySelectorAll<HTMLButtonElement>(
				'[aria-label="Satışa eklenecek bayi"] button',
			),
		]
			.find((option) => option.textContent?.startsWith(name + ' ('))!
			.click(),
	);
}
function button(text: string) {
	return [...container.querySelectorAll('button')].find(
		(button) => button.textContent === text,
	)!;
}
it('copies the product and unit price into another supplier row with zero partial-sale quantity', async () => {
	mount();
	act(() => button('Kısmi satış').click());
	input('1. satır miktar', '5');
	input('1. satır birim fiyat (TL/adet)', '20');
	await act(async () =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(save).not.toHaveBeenCalled();
	expect(container.querySelector('[role=alert]')!.textContent).toContain(
		'Kısmi satış için bir bayi seçin',
	);
	select('1. satır stok kaynağı', a);
	input('1. satır miktar', '5');
	addFromSupplier('B');
	expect(
		container.querySelector<HTMLSelectElement>(
			'[aria-label="2. satır ürün ve bellek"]',
		)!.value,
	).toBe('EMCP:8:piece');
	expect(
		container.querySelector<HTMLButtonElement>(
			'[aria-label="2. satır stok kaynağı"]',
		)!.textContent,
	).toContain('B (10 adet)');
	expect(
		container.querySelector<HTMLInputElement>('[aria-label="2. satır miktar"]')!
			.value,
	).toBe('0');
	expect(
		container.querySelector<HTMLInputElement>(
			'[aria-label="2. satır birim fiyat (TL/adet)"]',
		)!.value,
	).toBe('20');
	input('2. satır miktar', '2');
	await act(async () =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(save).toHaveBeenCalledWith(
		expect.objectContaining({
			mode: 'partial',
			lines: [
				expect.objectContaining({ bayiId: a, quantity: 5, revenue: 100 }),
				expect.objectContaining({ bayiId: b, quantity: 2, revenue: 40 }),
			],
		}),
	);
});
it('splits full-stock rows by supplier without copying quantities or losing the original unit price', async () => {
	mount();
	input('1. satır birim fiyat (TL/adet)', '10');
	addFromSupplier('B');
	expect(
		container.querySelector<HTMLInputElement>('[aria-label="1. satır miktar"]')!
			.value,
	).toBe('30');
	expect(
		container.querySelector<HTMLInputElement>('[aria-label="2. satır miktar"]')!
			.value,
	).toBe('10');
	expect(container.querySelector('[aria-live=polite]')!.textContent).toContain(
		'400,00',
	);
	await act(async () =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(save).toHaveBeenCalledWith(
		expect.objectContaining({
			mode: 'complete',
			lines: [
				expect.objectContaining({ bayiId: a, quantity: 30, revenue: 300 }),
				expect.objectContaining({ bayiId: b, quantity: 10, revenue: 100 }),
			],
		}),
	);
});
