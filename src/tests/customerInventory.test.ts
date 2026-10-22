import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CustomerPriceEditor } from '../app/component/CustomerPriceEditor';
import { CustomerPriceInput } from '../app/component/CustomerPriceInput';
import {
	applyCustomerPrices, customerItemKey, customerPriceGroups, customerPriceLimit,
	inventoryExportData, parseCustomerPrice, pricedInventoryItems, validateCustomerPrice, downloadInventory,
} from '../app/helpers/inventoryPageHelpers/customerInventory.helper';
import type { InventoryItemRecord } from '../app/types';

const ruleState = vi.hoisted(() => ({ assignments: [] as { key: string; ruleId: string; ruleName: string; rulePrice: number | null }[] }));
vi.mock('../app/hooks/useCustomerPriceRules', () => ({ useCustomerPriceRules: () => ({ data: { assignments: ruleState.assignments }, isPending: false, isError: false, isFetching: false }) }));
vi.mock('../app/helpers/inventoryPageHelpers/customerInventory.helper', async (original) => ({
	...await original<typeof import('../app/helpers/inventoryPageHelpers/customerInventory.helper')>(),
	downloadInventory: vi.fn().mockResolvedValue(undefined),
}));
const items: InventoryItemRecord[] = [
	{ model: '00123', bellekTipi: 'eMMC', depolama: 64, depolamaBirimi: 'GB', fiyat: 100, paraBirimi: 'TRY' },
	{ model: 'B', bellekTipi: 'eMMC', depolama: 64, depolamaBirimi: 'GB', fiyat: 120, paraBirimi: 'TRY' },
	{ model: 'C', bellekTipi: 'eMCP', depolama: 32, depolamaBirimi: 'GB', fiyat: null, paraBirimi: 'USD' },
];
let root: Root | undefined;
let container: HTMLDivElement;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperties(HTMLDialogElement.prototype, {
	showModal: { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
	close: { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } },
});
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; container?.remove(); ruleState.assignments = []; vi.clearAllMocks(); });
function setup() { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); }
function button(text: string) { return [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(text))!; }
function click(text: string) { act(() => button(text).click()); }
function mount(includePrices = true, records = items) {
	setup(); act(() => root!.render(createElement(CustomerPriceEditor, { items: records })));
	click('Tüm envanteri indir');
	if (includePrices) act(() => container.querySelector<HTMLButtonElement>('button[role="switch"]')!.click());
}
function input(label: string, value: string) {
	const element = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
	act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
function select(label: string, value: string) {
	const element = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
	act(() => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function download() { await act(async () => container.querySelector<HTMLButtonElement>('footer button')!.click()); }

describe('export-only inventory pricing', () => {
	it('keeps edits inside the modal and exports them without mutating source inventory', async () => {
		mount(); input('EMMC 64 GB TRY yeni fiyat', '75'); click('Tüm fiyat');
		expect(container.textContent).toContain('yalnızca indirilecek dosya');
		expect(items.map((item) => item.fiyat)).toEqual([100, 120, null]);
		await download();
		expect(downloadInventory).toHaveBeenCalledExactlyOnceWith([{ ...items[0], fiyat: 75 }, { ...items[1], fiyat: 75 }], true, 'xlsx');
		click('Kapat'); click('Tüm envanteri indir');
		act(() => container.querySelector<HTMLButtonElement>('button[role="switch"]')!.click());
		await download();
		expect(downloadInventory).toHaveBeenLastCalledWith(items.slice(0, 2), true, 'xlsx');
	});
	it('collects entered table prices on download without requiring an Apply click', async () => {
		mount(); input('EMMC 64 GB TRY yeni fiyat', '60'); await download();
		expect(downloadInventory).toHaveBeenCalledWith([{ ...items[0], fiyat: 60 }, { ...items[1], fiyat: 60 }], true, 'xlsx');
	});
	it('keeps existing prices for empty or cleared inputs', async () => {
		mount(); input('EMMC 64 GB TRY yeni fiyat', '75'); input('EMMC 64 GB TRY yeni fiyat', ''); await download();
		expect(downloadInventory).toHaveBeenCalledExactlyOnceWith(items.slice(0, 2), true, 'xlsx');
		expect(container.textContent).toContain('Boş bıraktığınız alanlarda mevcut fiyat korunur');
		expect(applyCustomerPrices(items, { [customerItemKey(items[0])]: null })).toEqual(items);
	});
	it('defaults to no prices and exposes only Excel/PDF plus an Excel extension picker', async () => {
		mount(false);
		expect(container.querySelector('button[role="switch"]')!.getAttribute('aria-checked')).toBe('false');
		expect(container.querySelector('table')).toBeNull();
		const fileType = container.querySelector<HTMLSelectElement>('select[aria-label="Dosya türü"]')!;
		expect([...fileType.options].map((option) => option.value)).toEqual(['excel', 'pdf']);
		expect([...container.querySelector<HTMLSelectElement>('select[aria-label="Excel dosya uzantısı"]')!.options].map((option) => option.value)).toEqual(['xlsx', 'csv', 'ods']);
		select('Excel dosya uzantısı', 'ods'); await download();
		expect(downloadInventory).toHaveBeenLastCalledWith(items.slice(0, 2), false, 'ods');
		select('Dosya türü', 'pdf');
		expect(container.querySelector('select[aria-label="Excel dosya uzantısı"]')).toBeNull();
		await download(); expect(downloadInventory).toHaveBeenLastCalledWith(items.slice(0, 2), false, 'pdf');
	});
	it('retains separate special-price tables without a filter editor or extra switch', async () => {
		ruleState.assignments = [{ key: customerItemKey(items[1]), ruleId: 'special', ruleName: 'Özel modeller', rulePrice: 120 }];
		mount();
		expect(container.querySelector('[role="tablist"]')).toBeNull();
		expect(container.querySelectorAll('button[role="switch"]')).toHaveLength(1);
		expect(container.textContent).not.toContain('Filtrelerle');
		expect(container.querySelector('section[aria-label="Özel fiyatlar"]')).not.toBeNull();
		input('EMMC 64 GB TRY yeni fiyat', '75'); input('EMMC 64 GB TRY Özel modeller yeni fiyat', '110');
		await download();
		expect(downloadInventory).toHaveBeenLastCalledWith([{ ...items[0], fiyat: 75 }, { ...items[1], fiyat: 110 }], true, 'xlsx');
	});
	it('exports zero prices and excludes missing prices even when price columns are disabled', async () => {
		const zero = { ...items[0], fiyat: 0 };
		mount(false, [zero, items[2]]); await download();
		expect(downloadInventory).toHaveBeenCalledExactlyOnceWith([zero], false, 'xlsx');
		expect(inventoryExportData([zero, items[2]], false)).toHaveLength(2);
		expect(pricedInventoryItems([zero, items[2], { ...zero, fiyat: NaN }])).toEqual([zero]);
	});
	it('caps excessive inputs, displays currency, and warns only on an excessive attempt', () => {
		setup();
		function Harness() { const [value, onChange] = useState(''); return createElement(CustomerPriceInput, { value, onChange, limit: 100, currency: 'TRY', label: 'Test price' }); }
		act(() => root!.render(createElement(Harness)));
		expect(container.textContent).toContain('TRY'); expect(container.querySelector('[role="alert"]')).toBeNull();
		input('Test price', '250'); expect(container.querySelector('input')!.value).toBe('100');
		expect(container.querySelector('[role="alert"]')!.textContent).toContain('100 TRY');
		input('Test price', '75'); expect(container.querySelector('[role="alert"]')).toBeNull();
		click('+100'); expect(container.querySelector('input')!.value).toBe('100'); expect(container.querySelector('[role="alert"]')).not.toBeNull();
	});
	it('keeps currency labels on merged storage groups and enforces original ceilings', () => {
		const groups = customerPriceGroups([items[0], { ...items[1], paraBirimi: 'USD' }]);
		expect(groups).toHaveLength(1); expect(groups[0].currency).toBe('TRY / USD');
		expect(customerPriceLimit(items.slice(0, 2))).toBe(100);
		expect(() => validateCustomerPrice(110, items.slice(0, 2))).toThrow();
		expect(applyCustomerPrices([items[0]], { [customerItemKey(items[0])]: 101 })[0].fiyat).toBe(100);
		for (const value of ['-1', 'Infinity', 'NaN', 'abc']) expect(() => parseCustomerPrice(value)).toThrow();
	});
	it('restores body scrolling and trigger focus when closed', () => {
		mount(false); expect(document.body.style.overflow).toBe('hidden');
		act(() => container.querySelector('dialog')!.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true })));
		expect(container.querySelector('dialog')).toBeNull(); expect(document.body.style.overflow).toBe('');
		expect(document.activeElement).toBe(container.querySelector('button'));
	});
});
