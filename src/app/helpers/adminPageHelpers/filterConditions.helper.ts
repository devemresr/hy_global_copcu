import type { SavedCondition } from './savedFilters.helper';
import type { FieldFilter, FieldFilterOp } from '../inventoryPageHelpers/fieldFilter.helper';

export type FilterCondition = SavedCondition & { id: string };
let nextId = 0;
export function newFilterCondition(): FilterCondition {
	return { id: `${Date.now()}-${nextId++}`, field: 'bellekTipi', op: 'equals', value: '' };
}

export const FILTER_OPERATORS: { value: FieldFilterOp; label: string; needsValue: boolean }[] = [
	{ value: 'equals', label: 'Eşittir', needsValue: true },
	{ value: 'notEquals', label: 'Eşit değildir', needsValue: true },
	{ value: 'contains', label: 'İçerir', needsValue: true },
	{ value: 'in', label: 'Şunlardan biri (virgülle ayırın)', needsValue: true },
	{ value: 'notIn', label: 'Şunların hiçbiri değil (virgülle ayırın)', needsValue: true },
	{ value: 'gt', label: 'Büyüktür', needsValue: true },
	{ value: 'gte', label: 'Büyük veya eşittir', needsValue: true },
	{ value: 'lt', label: 'Küçüktür', needsValue: true },
	{ value: 'lte', label: 'Küçük veya eşittir', needsValue: true },
	{ value: 'exists', label: 'Değeri var', needsValue: false },
	{ value: 'notExists', label: 'Değeri yok', needsValue: false },
];

export function conditionsToFilters(conditions: SavedCondition[]): FieldFilter[] {
	return conditions.map(({ field, op, value }) => ({
		field, op,
		value: op === 'in' || op === 'notIn' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value,
	}));
}
