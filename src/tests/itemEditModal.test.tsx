import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemEditModal } from '../app/component/admin/ItemEditModal';
import type { EditableInventoryItem } from '../app/types';
import type { ItemRule } from '../app/helpers/adminPageHelpers/itemRules.helper';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const item: EditableInventoryItem = {
	model: 'TEST123',
	bellekTipi: 'EMMC',
	depolama: 64,
	depolamaBirimi: 'GB',
	fiyat: 50,
	paraBirimi: 'TRY',
	fiyatBirimi: 'piece',
};

function mount(mode: 'create' | 'edit' = 'create', rules: ItemRule[] = []) {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	const onSave = vi.fn();
	act(() =>
		root.render(
			<ItemEditModal
				item={item}
				mode={mode}
				rules={rules}
				onSave={onSave}
				onClose={() => {}}
				enterEnabled={false}
				escapeEnabled={false}
			/>,
		),
	);
	return onSave;
}

function selectProduct(value: string) {
	const select = container.querySelector<HTMLSelectElement>(
		'#item-create-product',
	)!;
	act(() => {
		select.value = value;
		select.dispatchEvent(new Event('change', { bubbles: true }));
	});
}

function save() {
	act(() =>
		[...container.querySelectorAll('button')]
			.find((button) => button.textContent === 'Ekle')!
			.click(),
	);
}

describe('new product form', () => {
	it('replaces separate memory fields with the purchase product choices', () => {
		const onSave = mount();
		expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
		for (const field of ['bellekTipi', 'depolama', 'depolamaBirimi']) {
			expect(container.querySelector(`#item-edit-${field}`)).toBeNull();
		}
		const select = container.querySelector<HTMLSelectElement>(
			'#item-create-product',
		)!;
		expect(select.value).toBe('EMMC:64');
		expect(
			[...select.options].every((option) => /^(EMMC|EMCP):/.test(option.value)),
		).toBe(true);
		selectProduct('EMCP:128');
		save();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'TEST123',
				bellekTipi: 'EMCP',
				depolama: 128,
				depolamaBirimi: 'GB',
				fiyat: 50,
			}),
		);
	});

	it('clears capacity when switching to a product without memory and prevents rules restoring it', () => {
		const onSave = mount('create', [
			{
				id: 'memory',
				name: 'Memory default',
				enabled: true,
				conditions: [{ field: 'model', op: 'contains', value: 'TEST' }],
				actions: [
					{ field: 'depolama', value: '256' },
					{ field: 'bellekTipi', value: 'EMMC' },
				],
			},
		]);
		act(() =>
			container
				.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]
				.click(),
		);
		const select = container.querySelector<HTMLSelectElement>(
			'#item-create-product',
		)!;
		expect([...select.options].map((option) => option.value)).toEqual([
			'IPHONE',
			'TABLET',
		]);
		selectProduct('TABLET');
		save();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				bellekTipi: 'TABLET',
				depolama: null,
				ram: null,
			}),
		);
		act(() =>
			container
				.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0]
				.click(),
		);
		expect(select.value).toBe('EMMC:8');
	});

	it('preserves the existing edit form', () => {
		mount('edit');
		expect(container.querySelector('#item-create-product')).toBeNull();
		expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
		expect(
			container.querySelector<HTMLSelectElement>('#item-edit-bellekTipi')!
				.value,
		).toBe('EMMC');
		expect(
			container.querySelector<HTMLInputElement>('#item-edit-depolama')!.value,
		).toBe('64');
	});
});
