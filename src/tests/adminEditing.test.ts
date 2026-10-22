import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StorageSizeInput } from '../app/component/StorageSizeInput';
import { BulkActionEditor } from '../app/component/admin/BulkActionEditor';
import { BulkEditPanel } from '../app/component/admin/BulkEditPanel';
import type { BulkAction } from '../app/helpers/adminPageHelpers/bulkEdit.helper';
import { buildBulkFields } from '../app/helpers/adminPageHelpers/bulkEdit.helper';
import { FilterConditionEditor } from '../app/component/admin/FilterConditionEditor';
import type { FilterCondition } from '../app/helpers/adminPageHelpers/filterConditions.helper';

describe('bulk changes', () => {
	it('validates and preserves all selected fields, including units', () => {
		expect(buildBulkFields([
			{ field: 'bellekTipi', value: ' UFS ' },
			{ field: 'depolama', value: '16' },
			{ field: 'depolamaBirimi', value: 'GB' },
			{ field: 'fiyat', value: '0' },
		])).toEqual({ bellekTipi: 'UFS', depolama: 16, depolamaBirimi: 'GB', fiyat: 0 });
	});
	it('rejects invalid or duplicate fields before sending any update', () => {
		expect(() => buildBulkFields([{ field: 'fiyat', value: '10' }, { field: 'depolama', value: '-8' }])).toThrow();
		expect(() => buildBulkFields([{ field: 'fiyat', value: '10' }, { field: 'fiyat', value: '20' }])).toThrow();
		expect(() => buildBulkFields([])).toThrow();
	});
	it('allows clearing nullable storage and rejects sizes that are not powers of two', () => {
		expect(buildBulkFields([{ field: 'depolama', value: '' }])).toEqual({ depolama: null });
		expect(() => buildBulkFields([{ field: 'depolama', value: '55' }])).toThrow('2’nin kuvveti');
	});
});

let root: Root | undefined;
let container: HTMLDivElement;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => {
	if (root) act(() => root?.unmount());
	root = undefined;
	container?.remove();
});
function mount(initial: number | '') {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	function Harness() {
		const [value, setValue] = useState<number | ''>(initial);
		return createElement(StorageSizeInput, { value, onChange: setValue });
	}
	act(() => root!.render(createElement(Harness)));
}

describe('filter cross buttons', () => {
	it('removes one row and clears the last remaining condition', () => {
		container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
		function Harness() {
			const [conditions, onChange] = useState<FilterCondition[]>([
				{ id: 'first', field: 'model', op: 'contains', value: 'PA' },
				{ id: 'second', field: 'fiyat', op: 'exists', value: '' },
			]);
			return createElement(FilterConditionEditor, { conditions, onChange });
		}
		act(() => root!.render(createElement(Harness)));
		expect(container.querySelectorAll('button[aria-label="Koşulu sil"]')).toHaveLength(2);
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Koşulu sil"]')!.click());
		expect(container.querySelectorAll('button[aria-label="Koşulu sil"]')).toHaveLength(1);
		expect(container.querySelector<HTMLSelectElement>('select[aria-label="Koşul alanı"]')!.value).toBe('fiyat');
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Koşulu sil"]')!.click());
		expect(container.querySelector<HTMLSelectElement>('select[aria-label="Koşul işleci"]')!.value).toBe('equals');
		expect(container.querySelector<HTMLInputElement>('input[aria-label="Koşul değeri"]')!.value).toBe('');
	});
});
function click(title: string) {
	act(() => container.querySelector<HTMLButtonElement>(`button[title="${title}"]`)!.click());
}
describe('storage input', () => {
	it('doubles twice, quadruples and reverses using the left buttons', () => {
		mount(4);
		click('×2');
		expect(container.querySelector('input')!.value).toBe('8');
		click('×2');
		expect(container.querySelector('input')!.value).toBe('16');
		click('×4');
		expect(container.querySelector('input')!.value).toBe('64');
		click('÷4');
		click('÷2');
		expect(container.querySelector('input')!.value).toBe('8');
		expect(container.querySelector('[role="status"]')).toBeNull();
	});
	it('warns for an unusual capacity without blocking adjustments', () => {
		mount(55);
		expect(container.querySelector('[role="status"]')).not.toBeNull();
		click('×2');
		expect(container.querySelector('input')!.value).toBe('110');
	});
	it('starts an empty capacity at 8 using the increase button', () => {
		mount('');
		expect(container.querySelector<HTMLButtonElement>('button[title="÷2"]')!.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')).toBeNull();
		click('×2');
		expect(container.querySelector('input')!.value).toBe('8');
	});
	it('clamps division to 8 and disables further decrements', () => {
		mount(16);
		click('÷4');
		expect(container.querySelector('input')!.value).toBe('8');
		expect(container.querySelector<HTMLButtonElement>('button[title="÷2"]')!.disabled).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('button[title="÷4"]')!.disabled).toBe(true);
	});
	it('clamps multiplication to 1024 and disables further increments', () => {
		mount(512);
		click('×4');
		expect(container.querySelector('input')!.value).toBe('1024');
		expect(container.querySelector<HTMLButtonElement>('button[title="×2"]')!.disabled).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('button[title="×4"]')!.disabled).toBe(true);
	});
	it('clamps existing out-of-range values when adjusting toward the range', () => {
		mount(2);
		click('×2');
		expect(container.querySelector('input')!.value).toBe('8');
	});
});

describe('add field picker', () => {
	it('adds only the chosen field and returns to the add button', () => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		function Harness() {
			const [actions, setActions] = useState<BulkAction[]>([{ field: 'bellekTipi', value: 'UFS' }]);
			return createElement(BulkActionEditor, { actions, onChange: setActions });
		}
		act(() => root!.render(createElement(Harness)));
		const addButton = () => [...container.querySelectorAll('button')].find((button) => button.textContent === '+ Alan ekle')!;
		act(() => addButton().click());
		const picker = container.querySelector<HTMLSelectElement>('select[aria-label="Eklenecek alan"]')!;
		expect(picker).not.toBeNull();
		expect([...picker.options].some((option) => option.value === 'bellekTipi')).toBe(false);
		expect(container.querySelectorAll('select[aria-label="Değiştirilecek alan"]')).toHaveLength(1);
		act(() => {
			picker.value = 'depolama';
			picker.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('#bulk-action-depolama')).not.toBeNull();
		expect(container.querySelector('select[aria-label="Eklenecek alan"]')).toBeNull();
		expect(addButton()).toBeDefined();
		act(() => addButton().click());
		const nextPicker = container.querySelector<HTMLSelectElement>('select[aria-label="Eklenecek alan"]')!;
		expect([...nextPicker.options].some((option) => option.value === 'depolama')).toBe(false);
		act(() => nextPicker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
		expect(addButton()).toBeDefined();
		expect(container.querySelectorAll('select[aria-label="Değiştirilecek alan"]')).toHaveLength(2);
	});
});

describe('affected item preview', () => {
	it('toggles all properties and distinguishes planned changes from current values', () => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		act(() => root!.render(createElement(BulkEditPanel, {
			items: [{ _id: 'preview-item', version: 1, model: 'PREVIEW123', bellekTipi: 'UFS', depolama: 64, depolamaBirimi: 'GB', fiyat: 100, paraBirimi: 'TRY', uretici: 'PreviewMaker', ram: '6GB' }],
			requireApproval: true,
			enterEnabled: false,
			escapeEnabled: true,
			onApply: () => {},
		})));
		act(() => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Toplu Düzenleme'))!.click());
		const operator = [...container.querySelectorAll('select')].find((select) => [...select.options].some((option) => option.value === 'exists'))!;
		act(() => {
			operator.value = 'exists';
			operator.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('PREVIEW123');
		expect(container.textContent).not.toContain('PreviewMaker');
		const toggle = container.querySelector<HTMLInputElement>('input[aria-label="Tüm özellikleri göster"]')!;
		act(() => toggle.click());
		expect(container.textContent).not.toContain('PreviewMaker');
		expect(container.textContent).not.toContain('6GB');
		expect(container.textContent).not.toContain('preview-item');
		expect(container.textContent).toContain('Depoloma: 64');
		expect(container.textContent).toContain('Fiyat: 100');
		expect(container.querySelector('ul[aria-label="Etkilenecek öğeler"] li b')?.textContent).toBe('1.PREVIEW123');
		const highlighted = container.querySelector('li span.text-amber-700');
		expect(highlighted?.textContent).toContain('Bellek Türü');
		expect(highlighted?.textContent).toContain('→');
		expect(highlighted?.textContent).not.toContain('PreviewMaker');
		expect(container.querySelector('strong.text-red-600')?.textContent).toBe('1');
		act(() => toggle.click());
		expect(container.textContent).not.toContain('PreviewMaker');
		expect(container.querySelector('li span.text-amber-700')).toBeNull();
	});
});

describe('filtered bulk deletion', () => {
	it('always confirms, snapshots the selection, and deletes all matching pages only after approval', async () => {
		container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
		const items = Array.from({ length: 25 }, (_, index) => ({ _id: String(index), version: 1, model: `MATCH${index}`, bellekTipi: 'UFS', depolamaBirimi: 'GB' as const, fiyat: 10, paraBirimi: 'TRY' as const }));
		const onDelete = vi.fn().mockResolvedValue(undefined);
		act(() => root!.render(createElement(BulkEditPanel, { items, onDelete, onApply: () => {}, requireApproval: false, enterEnabled: false, escapeEnabled: true })));
		act(() => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Toplu Düzenleme'))!.click());
		const deleteButton = () => [...container.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Seçili') && button.textContent.endsWith('öğeyi sil'))!;
		expect(deleteButton().disabled).toBe(true);
		const operator = container.querySelector<HTMLSelectElement>('select[aria-label="Koşul işleci"]')!;
		act(() => { operator.value = 'exists'; operator.dispatchEvent(new Event('change', { bubbles: true })); });
		const firstCheckbox = container.querySelector<HTMLInputElement>('input[aria-label="MATCH0 seç"]')!;
		const firstRow = firstCheckbox.closest('li')!;
		// The property preview is part of the checkbox label too.
		act(() => firstRow.querySelector<HTMLSpanElement>('label > span:last-child')!.click());
		expect(firstCheckbox.checked).toBe(false);
		expect(firstRow.classList.contains('opacity-60')).toBe(true);
		act(() => firstRow.querySelector('b')!.click());
		expect(firstCheckbox.checked).toBe(true);
		act(() => firstCheckbox.click());
		expect(firstCheckbox.checked).toBe(false);
		expect(firstCheckbox.closest('li')?.classList.contains('opacity-60')).toBe(true);
		expect(container.querySelector<HTMLInputElement>('input[aria-label="Tüm eşleşenleri seç"]')!.indeterminate).toBe(true);
		act(() => deleteButton().click());
		expect(onDelete).not.toHaveBeenCalled();
		expect(container.textContent).toContain('24 öğe silinecek');
		act(() => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Vazgeç')!.click());
		expect(onDelete).not.toHaveBeenCalled();
		act(() => deleteButton().click());
		// A background filter change cannot enlarge the captured selection.
		act(() => { operator.value = 'notExists'; operator.dispatchEvent(new Event('change', { bubbles: true })); });
		await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Öğeleri sil')!.click());
		expect(onDelete).toHaveBeenCalledExactlyOnceWith(items.slice(1));
	});
	it('updates only checked items and disables actions when none are selected', async () => {
		container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
		const items = ['A', 'B'].map((model) => ({ _id: model, model, version: 1, bellekTipi: 'UFS', depolamaBirimi: 'GB' as const, fiyat: 10, paraBirimi: 'TRY' as const }));
		const onApply = vi.fn();
		act(() => root!.render(createElement(BulkEditPanel, { items, onApply, onDelete: vi.fn(), requireApproval: false, enterEnabled: false, escapeEnabled: true })));
		act(() => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Toplu Düzenleme'))!.click());
		const operator = container.querySelector<HTMLSelectElement>('select[aria-label="Koşul işleci"]')!;
		act(() => { operator.value = 'exists'; operator.dispatchEvent(new Event('change', { bubbles: true })); });
		const all = container.querySelector<HTMLInputElement>('input[aria-label="Tüm eşleşenleri seç"]')!;
		act(() => all.click());
		const updateButton = () => [...container.querySelectorAll('button')].find((button) => button.textContent?.endsWith('öğeyi güncelle'))!;
		expect(updateButton().disabled).toBe(true);
		expect([...container.querySelectorAll('button')].find((button) => button.textContent?.endsWith('öğeyi sil'))!.disabled).toBe(true);
		act(() => container.querySelector<HTMLInputElement>('input[aria-label="B seç"]')!.click());
		const value = container.querySelector<HTMLInputElement>('fieldset input[type="text"]')!;
		act(() => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(value, 'eMMC');
			value.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await act(async () => updateButton().click());
		expect(onApply).toHaveBeenCalledExactlyOnceWith([items[1]], { bellekTipi: 'eMMC' });
		act(() => all.click());
		expect(container.querySelectorAll('li.opacity-60')).toHaveLength(0);
	});
});
