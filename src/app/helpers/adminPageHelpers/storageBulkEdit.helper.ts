import type { ItemDto } from '../../hooks/api/endpoints/useItems';
import type { EditableField } from '../../types';
import { buildBulkFields } from './bulkEdit.helper';
import { resolveBulkItemRules, type ItemRule } from './itemRules.helper';

export type StorageEditGroup = {
	id: string;
	type: 'eMMC' | 'eMCP';
	capacityGb: number | null;
	label: string;
	currency: string;
	items: ItemDto[];
	commonValue: string | number | null;
	commonCount: number;
};

export function buildStorageEditGroups(items: ItemDto[], field: EditableField): StorageEditGroup[] {
	const groups = new Map<string, StorageEditGroup>();
	for (const item of items) {
		const memoryType = item.bellekTipi?.trim().toLowerCase();
		if (memoryType !== 'emmc' && memoryType !== 'emcp') continue;
		const type = memoryType === 'emmc' ? 'eMMC' : 'eMCP';
		const capacityGb = item.depolama == null ? null : item.depolama * (item.depolamaBirimi === 'TB' ? 1024 : 1);
		// Prices in different currencies must never share a modal value.
		const currency = field === 'fiyat' ? item.paraBirimi : '';
		const id = `${type}:${capacityGb ?? 'empty'}:${currency}${field === 'depolama' ? `:${item.depolamaBirimi}` : ''}`;
		if (!groups.has(id)) groups.set(id, { id, type, capacityGb, label: capacityGb === null ? 'Depolama belirtilmemiş' : capacityGb >= 1024 && capacityGb % 1024 === 0 ? `${capacityGb / 1024} TB` : `${capacityGb} GB`, currency, items: [], commonValue: null, commonCount: 0 });
		groups.get(id)!.items.push(item);
	}
	for (const group of groups.values()) {
		const counts = new Map<string | number | null, number>();
		for (const item of group.items) {
			const value = item[field] ?? null;
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		// Resolve ties by value so refetch ordering cannot change a row's default.
		const [value, count] = [...counts].sort((a, b) => b[1] - a[1] || String(a[0] ?? '').localeCompare(String(b[0] ?? ''), undefined, { numeric: true }))[0];
		group.commonValue = value; group.commonCount = count;
	}
	return [...groups.values()].sort((a, b) => a.type.localeCompare(b.type) || (a.capacityGb ?? Infinity) - (b.capacityGb ?? Infinity) || a.currency.localeCompare(b.currency));
}

export function planStorageEdit(group: StorageEditGroup, field: EditableField, value: string, rules: readonly ItemRule[], skipRuleExceptions: boolean) {
	const fields = buildBulkFields([{ field, value }]);
	let skipped = 0;
	const items = group.items.filter((item) => {
		const current = resolveBulkItemRules(item, {}, rules);
		const next = resolveBulkItemRules(item, fields, rules);
		const existingException = current.sources[field] && current.item[field] === item[field] && (item[field] ?? null) !== group.commonValue;
		const proposedException = next.sources[field] && next.item[field] !== fields[field];
		if (skipRuleExceptions && (existingException || proposedException)) { skipped++; return false; }
		return fields[field] !== (item[field] ?? null);
	});
	return { group, fields, items, skipped };
}

export type StorageEditPlan = ReturnType<typeof planStorageEdit>;
