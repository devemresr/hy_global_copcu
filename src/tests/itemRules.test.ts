import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ItemEditModal } from '../app/component/admin/ItemEditModal';
import { ItemRulesPanel } from '../app/component/admin/ItemRulesPanel';
import { ITEM_RULES_KEY, loadItemRules, resolveItemRules, validateItemRule, type ItemRule } from '../app/helpers/adminPageHelpers/itemRules.helper';
import type { EditableInventoryItem } from '../app/types';

const draft: EditableInventoryItem = { model: 'PA123', bellekTipi: null, depolama: null, depolamaBirimi: 'GB', fiyat: 50, paraBirimi: 'TRY' };
const rule: ItemRule = { id: 'pa-price', name: 'PA fiyatı', enabled: true, conditions: [{ field: 'model', op: 'contains', value: 'pa' }], actions: [{ field: 'fiyat', value: '150' }] };

describe('creation rule resolution', () => {
	it('matches case-insensitively and records which rule provided a default', () => {
		const result = resolveItemRules(draft, [rule]);
		expect(result.item.fiyat).toBe(150);
		expect(result.sources.fiyat?.id).toBe(rule.id);
		expect(draft.fiyat).toBe(50);
	});
	it('uses the highest matching rule per field and ignores disabled rules', () => {
		const lower: ItemRule = { ...rule, id: 'lower', actions: [{ field: 'fiyat', value: '200' }, { field: 'bellekTipi', value: 'UFS' }] };
		expect(resolveItemRules(draft, [rule, lower]).item).toMatchObject({ fiyat: 150, bellekTipi: 'UFS' });
		expect(resolveItemRules(draft, [{ ...rule, enabled: false }, lower]).item.fiyat).toBe(200);
	});
	it('keeps custom overrides while retaining the matching rule attribution', () => {
		const result = resolveItemRules({ ...draft, fiyat: 250 }, [rule], new Set(['fiyat']));
		expect(result.item.fiyat).toBe(250);
		expect(result.sources.fiyat?.name).toBe('PA fiyatı');
	});
	it('restores manual values when a rule no longer matches', () => {
		expect(resolveItemRules({ ...draft, model: 'XX123' }, [rule]).item.fiyat).toBe(50);
	});
	it('uses AND conditions and supports membership filters', () => {
		const conditional: ItemRule = { ...rule, conditions: [...rule.conditions, { field: 'bellekTipi', op: 'in', value: 'UFS, EMMC' }] };
		expect(resolveItemRules(draft, [conditional]).item.fiyat).toBe(50);
		expect(resolveItemRules({ ...draft, bellekTipi: 'ufs' }, [conditional]).item.fiyat).toBe(150);
	});
	it('allows lower-priority rules to see earlier defaults without recursively evaluating', () => {
		const memory: ItemRule = { ...rule, id: 'memory', actions: [{ field: 'bellekTipi', value: 'UFS' }] };
		const price: ItemRule = { ...rule, conditions: [{ field: 'bellekTipi', op: 'equals', value: 'UFS' }] };
		expect(resolveItemRules(draft, [memory, price]).item.fiyat).toBe(150);
	});
	it('validates saved data and rejects invalid rule actions and incomplete filters', () => {
		expect(validateItemRule(rule)).toEqual(rule);
		expect(() => validateItemRule({ ...rule, conditions: [] })).toThrow();
		expect(() => validateItemRule({ ...rule, actions: [{ field: 'fiyat', value: '-1' }] })).toThrow();
		expect(() => validateItemRule({ ...rule, actions: [{ field: 'deletedAt', value: 'x' }] })).toThrow();
	});
	it('restores rules from browser storage safely', () => {
		localStorage.setItem(ITEM_RULES_KEY, JSON.stringify([rule]));
		expect(loadItemRules()).toEqual([rule]);
		localStorage.setItem(ITEM_RULES_KEY, '{invalid');
		expect(loadItemRules()).toEqual([]);
	});
});

let root: Root | undefined;
let container: HTMLDivElement;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => {
	if (root) act(() => root?.unmount());
	root = undefined;
	container?.remove();
	localStorage.removeItem(ITEM_RULES_KEY);
});
function setup() {
	container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
}
function enter(input: HTMLInputElement, value: string) {
	act(() => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}
function clickButton(text: string) {
	act(() => [...container.querySelectorAll('button')].find((button) => button.textContent === text)!.click());
}
function mountForm(mode: 'create' | 'edit' = 'create', item = draft) {
	setup();
	const onSave = vi.fn();
	act(() => root!.render(createElement(ItemEditModal, { item, mode, rules: [rule], enterEnabled: false, escapeEnabled: false, onClose: () => {}, onSave })));
	return onSave;
}

describe('new item rule defaults', () => {
	it('fills and locks a rule-controlled price and submits that value', () => {
		const onSave = mountForm();
		const input = container.querySelector<HTMLInputElement>('#item-edit-fiyat')!;
		expect(input.value).toBe('150'); expect(input.disabled).toBe(true);
		expect(container.querySelector('#item-edit-fiyat-rule')?.textContent).toContain('PA fiyatı');
		expect([...input.parentElement!.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
		clickButton('Ekle'); expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ fiyat: 150 }));
	});
	it('lets a custom override replace the rule default, then restores the default when unchecked', () => {
		const onSave = mountForm();
		const input = container.querySelector<HTMLInputElement>('#item-edit-fiyat')!;
		const checkbox = container.querySelector<HTMLInputElement>('input[aria-label="Fiyat: Özel değer kullan"]')!;
		act(() => checkbox.click()); expect(input.disabled).toBe(false); expect(input.value).toBe('150');
		enter(input, '225'); clickButton('Ekle'); expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ fiyat: 225 }));
		act(() => checkbox.click()); expect(input.value).toBe('150'); expect(input.disabled).toBe(true);
	});
	it('reacts as the model is typed and removes the lock when the match disappears', () => {
		mountForm('create', { ...draft, model: '' });
		const model = container.querySelector<HTMLInputElement>('#item-edit-model')!;
		const price = container.querySelector<HTMLInputElement>('#item-edit-fiyat')!;
		expect(price.value).toBe('50'); expect(price.disabled).toBe(false);
		enter(model, 'part123'); expect(price.value).toBe('150'); expect(price.disabled).toBe(true);
		enter(model, 'other123'); expect(price.value).toBe('50'); expect(price.disabled).toBe(false);
		expect(container.querySelector('#item-edit-fiyat-rule')).toBeNull();
	});
	it('does not apply creation rules to edits of existing items', () => {
		mountForm('edit');
		const price = container.querySelector<HTMLInputElement>('#item-edit-fiyat')!;
		expect(price.value).toBe('50'); expect(price.disabled).toBe(false);
		expect(container.querySelector('#item-edit-fiyat-rule')).toBeNull();
	});
});

describe('rules panel', () => {
	it('builds a validated rule with the shared filters and field editor', async () => {
		setup(); const onChange = vi.fn();
		act(() => root!.render(createElement(ItemRulesPanel, { rules: [], onChange })));
		act(() => container.querySelector('section > button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
		enter(container.querySelector<HTMLInputElement>('input[placeholder="Örn. PA modelleri için fiyat"]')!, 'PA fiyatı');
		enter(container.querySelector<HTMLInputElement>('input[aria-label="Koşul değeri"]')!, 'pa');
		enter(container.querySelector<HTMLInputElement>('#rule-action-fiyat')!, '150');
		await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Kuralı kaydet')!.click());
		expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'PA fiyatı', enabled: true, conditions: rule.conditions, actions: rule.actions })]);
	});
});
