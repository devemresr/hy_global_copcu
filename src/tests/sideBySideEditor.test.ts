import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SideBySideEditor } from '../app/component/admin/SideBySideEditor';
import { FilterConditionEditor } from '../app/component/admin/FilterConditionEditor';
import type { FilterCondition } from '../app/helpers/adminPageHelpers/filterConditions.helper';
import type { ItemDto } from '../app/hooks/api/endpoints/useItems';
import { matchesFieldFilter } from '../app/helpers/inventoryPageHelpers/fieldFilter.helper';
import { parseSharedFilter, serializeFilter } from '../app/helpers/adminPageHelpers/savedFilters.helper';
import { findBulkRuleConflicts, type ItemRule } from '../app/helpers/adminPageHelpers/itemRules.helper';
import { useBulkRuleApproval } from '../app/hooks/useBulkRuleApproval';
import { buildStorageEditGroups, planStorageEdit } from '../app/helpers/adminPageHelpers/storageBulkEdit.helper';

function item(id: string, fields: Partial<ItemDto> = {}): ItemDto {
	return { _id: id, version: 1, model: id, bellekTipi: 'eMMC', depolama: 64, depolamaBirimi: 'GB', fiyat: 100, paraBirimi: 'TRY', ...fields };
}
const items = [item('A'), item('B'), item('C'), item('RULE', { fiyat: 150 }), item('OUTLIER', { fiyat: 130 }), item('MCP', { bellekTipi: 'EMCP', depolama: 32 }), item('OTHER', { bellekTipi: 'UFS' })];
const rule: ItemRule = { id: 'price', name: 'Special price', enabled: true, conditions: [{ field: 'model', op: 'equals', value: 'RULE' }], actions: [{ field: 'fiyat', value: '150' }] };
let root: Root | undefined;
let container: HTMLDivElement;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; container?.remove(); });
function setup() { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); }
function button(text: string) { return [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(text))!; }
function change(element: HTMLInputElement, value: string) {
	act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
function mount(requireApproval = false, onApply = vi.fn().mockResolvedValue(undefined)) {
	setup();
	act(() => root!.render(createElement(SideBySideEditor, { items, rules: [rule], disabled: false, requireApproval, enterEnabled: false, escapeEnabled: false, onApply })));
	act(() => button('Depolama gruplarını').click());
	return onApply;
}
function tableInput(type = 'eMMC') { return container.querySelector<HTMLInputElement>(`section[aria-label="${type} düzenleme tablosu"] tbody input`)!; }

describe('storage group bulk edits', () => {
	it('groups by IC type and capacity, with separate prices for each currency', () => {
		const groups = buildStorageEditGroups([...items, item('USD', { paraBirimi: 'USD' }), item('TB', { depolama: 1, depolamaBirimi: 'TB' }), item('GB', { depolama: 1024 })], 'fiyat');
		const emmc = groups.find((group) => group.type === 'eMMC' && group.capacityGb === 64 && group.currency === 'TRY')!;
		expect(emmc.commonValue).toBe(100); expect(emmc.commonCount).toBe(3); expect(emmc.items).toHaveLength(5);
		expect(groups.find((group) => group.currency === 'USD')!.items.map((entry) => entry._id)).toEqual(['USD']);
		expect(groups.find((group) => group.capacityGb === 1024)!.items).toHaveLength(2);
		expect(groups.flatMap((group) => group.items).some((entry) => entry._id === 'OTHER')).toBe(false);
	});
	it('skips rule exceptions while retaining ordinary price outliers and ignores disabled rules', () => {
		const group = buildStorageEditGroups(items, 'fiyat').find((entry) => entry.type === 'eMMC')!;
		const plan = planStorageEdit(group, 'fiyat', '200', [rule], true);
		expect(plan.skipped).toBe(1); expect(plan.items.map((entry) => entry._id)).toEqual(['A', 'B', 'C', 'OUTLIER']);
		expect(planStorageEdit(group, 'fiyat', '200', [{ ...rule, enabled: false }], true).items).toHaveLength(5);
		expect(planStorageEdit(group, 'fiyat', '200', [rule], false).skipped).toBe(0);
		expect(planStorageEdit(group, 'fiyat', '200', [rule], false).items).toHaveLength(5);
	});
	it('opens two summary tables with price selected and applies a whole storage row', async () => {
		const onApply = mount();
		expect(container.querySelectorAll('table')).toHaveLength(2);
		expect(container.querySelector<HTMLSelectElement>('select[aria-label="Yan yana düzenlenecek alan"]')!.value).toBe('fiyat');
		expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
		expect(container.textContent).toContain('3/5 ürün');
		expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
		change(tableInput(), '200');
		await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="eMMC 64 GB TRY uygula"]')!.click());
		expect(onApply).toHaveBeenCalledExactlyOnceWith([items[0], items[1], items[2], items[4]], { fiyat: 200 });
	});
	it('applies changes from both tables with the panel footer action', async () => {
		const onApply = mount(); change(tableInput(), '200'); change(tableInput('eMCP'), '250');
		await act(async () => button('Tümünü uygula').click());
		expect(onApply).toHaveBeenCalledTimes(2);
		expect(onApply).toHaveBeenCalledWith([items[5]], { fiyat: 250 });
	});
	it('waits for approval and leaves drafts available if saving fails', async () => {
		const onApply = vi.fn().mockRejectedValue(new Error('Save failed'));
		mount(true, onApply); change(tableInput(), '200');
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="eMMC 64 GB TRY uygula"]')!.click());
		expect(onApply).not.toHaveBeenCalled(); expect(container.textContent).toContain('Toplu değişikliği onayla');
		await act(async () => button('Onayla').click());
		expect(onApply).toHaveBeenCalledOnce(); expect(container.querySelector('[role="alert"]')!.textContent).toContain('Save failed'); expect(tableInput().value).toBe('200');
	});
});

describe('bulk rule conflict approval', () => {
	it('offers a separate exclusion action without approving a rule override', async () => {
		setup();
		const decision = vi.fn();
		function Harness() {
			const approval = useBulkRuleApproval(true);
			return createElement('div', null, createElement('button', { onClick: async () => decision(await approval.requestApproval(findBulkRuleConflicts(items[3], { fiyat: 200 }, [rule]))) }, 'Apply edit'), approval.dialog);
		}
		act(() => root!.render(createElement(Harness)));
		act(() => button('Apply edit').click());
		expect(decision).not.toHaveBeenCalled();
		await act(async () => button('Çelişenleri atla ve uygula').click());
		expect(decision).toHaveBeenCalledExactlyOnceWith('exclude');
		expect(container.querySelector('[role="dialog"]')).toBeNull();
	});
	it('warns about the requested price instead of replacing it and saves only after explicit approval', async () => {
		setup();
		const save = vi.fn();
		const conflicts = findBulkRuleConflicts(items[3], { fiyat: 200 }, [rule]);
		expect(conflicts).toEqual([{ model: 'RULE', field: 'fiyat', ruleName: 'Special price', ruleValue: 150, requestedValue: 200 }]);
		function Harness() {
			const approval = useBulkRuleApproval(true);
			return createElement('div', null, createElement('button', { onClick: async () => { if (await approval.requestApproval(conflicts) === 'override') save({ fiyat: 200 }); } }, 'Apply edit'), approval.dialog);
		}
		act(() => root!.render(createElement(Harness)));
		act(() => button('Apply edit').click());
		expect(save).not.toHaveBeenCalled();
		expect(container.querySelector('[role="dialog"]')!.textContent).toContain('150');
		expect(container.querySelector('[role="dialog"]')!.textContent).toContain('200');
		await act(async () => button('Vazgeç').click());
		expect(save).not.toHaveBeenCalled();
		act(() => button('Apply edit').click());
		await act(async () => button('Kurala rağmen uygula').click());
		expect(save).toHaveBeenCalledExactlyOnceWith({ fiyat: 200 });
	});
	it('does not warn when the requested value matches the rule or when no enabled rule matches', () => {
		expect(findBulkRuleConflicts(items[3], { fiyat: 150 }, [rule])).toEqual([]);
		expect(findBulkRuleConflicts(items[0], { fiyat: 200 }, [rule])).toEqual([]);
		expect(findBulkRuleConflicts(items[3], { fiyat: 200 }, [{ ...rule, enabled: false }])).toEqual([]);
		expect(findBulkRuleConflicts(items[3], { depolama: 128 }, [rule])).toEqual([]);
	});
});

describe('storage filter input', () => {
	it('uses the storage scaling controls and hides them for valueless operators', () => {
		setup();
		function Harness() {
			const [conditions, setConditions] = useState<FilterCondition[]>([{ id: 'storage', field: 'depolama', op: 'equals', value: '16' }]);
			return createElement(FilterConditionEditor, { conditions, onChange: setConditions });
		}
		act(() => root!.render(createElement(Harness)));
		act(() => container.querySelector<HTMLButtonElement>('button[title="×2"]')!.click());
		expect(container.querySelector('input')!.value).toBe('32');
		act(() => container.querySelector<HTMLButtonElement>('button[title="÷4"]')!.click());
		expect(container.querySelector('input')!.value).toBe('8');
		const op = container.querySelector<HTMLSelectElement>('select[aria-label="Koşul işleci"]')!;
		act(() => { op.value = 'exists'; op.dispatchEvent(new Event('change', { bubbles: true })); });
		expect(container.querySelector('input')).toBeNull(); expect(container.querySelector('button[title="×2"]')).toBeNull();
	});
});

describe('not contains', () => {
	it('negates contains case-insensitively, including missing values, and survives sharing', () => {
		const condition = { field: 'model' as const, op: 'notContains' as const, value: 'pa' };
		for (const row of [{ model: 'PA123' }, { model: 'other' }, { model: null }, {}]) expect(matchesFieldFilter(row, condition)).toBe(!matchesFieldFilter(row, { ...condition, op: 'contains' }));
		expect(parseSharedFilter(serializeFilter([condition]))).toEqual([condition]);
	});
});
