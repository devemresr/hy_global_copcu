import { openBayiMenu, closeBayiMenu } from './bayiMenu.helpers';
vi.mock('../app/hooks/api/endpoints/useInvestors', () => ({
	useInvestors: () => ({ data: { investors: [] }, isError: false }),
}));
import { afterEach, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReportFilters } from '../app/component/admin/ReportFilters';
import type { PurchaseFilters } from '../app/schemas/purchase.schema';
import { purchasePresetRange } from '../app/helpers/purchasePeriod.helper';
import { purchaseRangeLabel } from '../app/helpers/purchasePeriod.helper';
import { numericFilterLabel } from '../app/helpers/numericFilters.helper';

vi.mock('../app/hooks/api/endpoints/useBayiler', () => ({
	useBayiler: () => ({
		data: {
			bayiler: [
				{ _id: '000000000000000000000001', name: 'Birinci' },
				{ _id: '000000000000000000000002', name: 'İkinci' },
			],
		},
		isError: false,
	}),
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
	choose('select[aria-label="1. koşul ürünü"]', 'EMMC:16');
	expect(
		[
			...container.querySelectorAll<HTMLOptionElement>(
				'select[id$="-field-0"] option',
			),
		].map((option) => option.value),
	).not.toContain('memoryGb');
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
	initial: PurchaseFilters = {},
	reportKind: 'purchase' | 'stock' | 'balance' = 'purchase',
) {
	const changed = vi.fn();
	function Harness() {
		const [value, setValue] = useState(initial);
		return (
			<ReportFilters
				value={value}
				reportKind={reportKind}
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
	const date = purchaseRangeLabel(purchasePresetRange('today'));
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
		} as PurchaseFilters,
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

it('removes each active purchase condition immediately while preserving other filters', () => {
	const changed = mount({
		bayiName: 'Store',
		from: '2026-11-01',
		until: '2026-11-12',
		minTotal: 10,
		maxTotal: 100,
		numericFilters: [
			{ field: 'quantityPiece', min: 2 },
			{ field: 'lineTotal', max: 50 },
		],
	});
	const remove = (prefix: string) =>
		act(() =>
			[
				...container.querySelectorAll<HTMLButtonElement>(
					'[role="status"] li button',
				),
			]
				.find((button) =>
					button.getAttribute('aria-label')!.startsWith(prefix),
				)!
				.click(),
		);
	remove('Tüm ürünler → Ürün miktarı');
	expect(changed.mock.lastCall![0]).toMatchObject({
		bayiName: 'Store',
		minTotal: 10,
		numericFilters: [{ field: 'lineTotal', max: 50 }],
	});
	remove('Dönem:');
	expect(changed.mock.lastCall![0]).not.toHaveProperty('from');
	expect(changed.mock.lastCall![0]).not.toHaveProperty('until');
	remove('Bayi:');
	expect(changed.mock.lastCall![0]).not.toHaveProperty('bayiName');
	expect(container.querySelector('select[id$="-bayi"]')).toBeNull();
	remove('İşlem geneli → İşlem toplamı');
	expect(changed.mock.lastCall![0]).not.toHaveProperty('minTotal');
	expect(changed.mock.lastCall![0]).not.toHaveProperty('maxTotal');
	remove('Tüm ürünler → Ürün toplamı');
	expect(container.querySelector('[role="status"]')!.textContent).toContain(
		'etkin filtre yok',
	);
});
it.each([
	[
		'stock',
		{ movementType: 'all-sales', productType: 'EMMC', memoryGb: 8 },
		['Hareket:', 'Ürün:', 'Bellek:'],
	],
	[
		'balance',
		{ direction: 'income', group: 'investment', categoryId: 'custom' },
		['İşlem kaynağı:', 'Ana tür:', 'Alt tür:'],
	],
] as const)(
	'removes extended %s filters instead of restoring them',
	(kind, extra, labels) => {
		const changed = mount({ ...extra, from: '2026-11-01' }, kind);
		for (const label of labels) {
			act(() =>
				[
					...container.querySelectorAll<HTMLButtonElement>(
						'[role="status"] li button',
					),
				]
					.find((button) =>
						button.getAttribute('aria-label')!.startsWith(label),
					)!
					.click(),
			);
		}
		expect(changed.mock.lastCall![0]).toEqual({ from: '2026-11-01' });
	},
);

it('applies selected bayi checkboxes together and removes just one active bayi', () => {
	const changed = mount();
	openBayiMenu('Rapor bayi filtresi');
	const bayis = [
		...document.querySelectorAll<HTMLButtonElement>('[role=menuitemcheckbox]'),
	];
	expect(bayis).toHaveLength(2);
	expect(
		bayis.every((option) => option.getAttribute('aria-checked') === 'false'),
	).toBe(true);
	act(() => bayis[0].click());
	act(() => bayis[1].click());
	expect(
		document.querySelectorAll('[role=menuitemcheckbox][aria-checked=true]'),
	).toHaveLength(2);
	closeBayiMenu();
	expect(changed).not.toHaveBeenCalled();
	act(() =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(changed).toHaveBeenLastCalledWith(
		expect.objectContaining({
			bayiIds: ['000000000000000000000001', '000000000000000000000002'],
		}),
	);
	const remove = container.querySelector<HTMLButtonElement>(
		'button[aria-label="Bayi: Birinci filtresini kaldır"]',
	)!;
	act(() => remove.click());
	expect(changed).toHaveBeenLastCalledWith(
		expect.objectContaining({ bayiIds: ['000000000000000000000002'] }),
	);
});
