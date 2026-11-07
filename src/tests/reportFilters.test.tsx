import { afterEach, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OrderHistoryFilters } from '../app/component/admin/OrderHistoryFilters';
import type { OrderFilters } from '../app/schemas/order.schema';
import { orderPresetRange } from '../app/helpers/orderPeriod.helper';
import { orderRangeLabel } from '../app/helpers/orderPeriod.helper';
import { numericFilterLabel } from '../app/helpers/numericFilters.helper';

vi.mock('../app/hooks/api/endpoints/useBayiler', () => ({
	useBayiler: () => ({ data: { bayiler: [] }, isError: false }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	vi.restoreAllMocks();
});
it('selects a product and memory size before applying a unit-price condition and names them in a pill', () => {
	expect(
		numericFilterLabel({
			field: 'unitPriceG',
			productType: 'IPHONE',
			min: 0.0001,
		}),
	).toBe('iPhone → Birim alış fiyatı (TL/g): 0,0001 – Üst sınır yok');
	const changed = mount();
	const choose = (selector: string, value: string) =>
		act(() => {
			const select = container.querySelector<HTMLSelectElement>(selector)!;
			select.value = value;
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
	choose('select[aria-label="1. koşul ürünü"]', 'EMMC');
	choose('select[aria-label="1. koşul bellek boyutu"]', '16');
	choose('select[id$="-field-0"]', 'unitPricePiece');
	const min = container.querySelector<HTMLInputElement>('input[id$="-min-0"]')!;
	act(() => {
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			'value',
		)!.set!.call(min, '120');
		min.dispatchEvent(new Event('input', { bubbles: true }));
	});
	act(() =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(changed).toHaveBeenLastCalledWith({
		numericFilters: [
			expect.objectContaining({
				field: 'unitPricePiece',
				productType: 'EMMC',
				memoryGb: 16,
				min: 120,
			}),
		],
	});
	const pill = container.querySelector('[role="status"] li')!;
	expect(pill.className).toContain('rounded-full');
	expect(pill.textContent).toContain(
		'eMMC · 16 GB → Birim alış fiyatı (TL/adet): 120',
	);
});
function mount(
	initial: OrderFilters = {},
	context: 'orders' | 'stock' | 'finance' = 'orders',
) {
	const changed = vi.fn();
	function Harness() {
		const [value, setValue] = useState(initial);
		return (
			<OrderHistoryFilters
				value={value}
				context={context}
				onChange={(next) => {
					setValue(next);
					changed(next);
				}}
			/>
		);
	}
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<Harness />));
	return changed;
}
it('keeps exact preset dates off by default and toggles their visibility without changing filters', () => {
	const changed = mount();
	const today = container.querySelector<HTMLButtonElement>(
		'button[aria-label="Bugün"]',
	)!;
	const date = orderRangeLabel(orderPresetRange('today'));
	expect(today.textContent).not.toContain(date);
	const toggle = container.querySelector<HTMLButtonElement>(
		'button[role="switch"]',
	)!;
	expect(toggle.getAttribute('aria-checked')).toBe('false');
	act(() => toggle.click());
	expect(today.textContent).toContain(date);
	expect(changed).not.toHaveBeenCalled();
});
it('shows active filter conditions and opens and focuses the filter panel from its notice', () => {
	mount(
		{
			numericFilters: [{ field: 'profit', min: -100, max: 0 }],
			movementType: 'restock',
		} as OrderFilters,
		'stock',
	);
	expect(container.querySelector('[role="status"]')?.textContent).toContain(
		'2 filtre',
	);
	expect(container.textContent).toContain('Gerçekleşen kâr (TL): -100 – 0');
	const details = container.querySelector('details')!;
	const scroll = vi.fn();
	details.scrollIntoView = scroll;
	details.open = false;
	act(() => container.querySelector<HTMLAnchorElement>('a')!.click());
	expect(details.open).toBe(true);
	expect(scroll).toHaveBeenCalledOnce();
	expect(document.activeElement).toBe(details.querySelector('summary'));
});
it('applies signed decimal ranges and resolves stepper updates to numbers', () => {
	const changed = mount(
		{ numericFilters: [{ field: 'profit', min: -1.5, max: 100 }] },
		'stock',
	);
	const field = container.querySelector<HTMLInputElement>(
		'input[id$="-min-0"]',
	)!;
	const set = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		'value',
	)!.set!;
	act(() => {
		set.call(field, '-2,5');
		field.dispatchEvent(new Event('input', { bubbles: true }));
	});
	const form = container.querySelector('form')!;
	act(() =>
		form.dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	expect(changed).toHaveBeenLastCalledWith({
		numericFilters: [{ field: 'profit', min: -2.5, max: 100 }],
	});
	act(() => field.parentElement!.querySelector('button')!.click());
	act(() =>
		form.dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	expect(changed).toHaveBeenLastCalledWith({
		numericFilters: [{ field: 'profit', min: 97.5, max: 100 }],
	});
});
