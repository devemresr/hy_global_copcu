import type {
	EditableField,
	EditableInventoryItem,
	FieldChange,
} from '../../types';

const EDITABLE_FIELDS: EditableField[] = [
	'Model',
	'BellekTipi',
	'Depoloma',
	'ram',
	'Fiyat',
	'Currency',
];

export function diffEditableItem(
	previous: EditableInventoryItem,
	next: EditableInventoryItem,
): FieldChange[] {
	return EDITABLE_FIELDS.filter((field) => previous[field] !== next[field]).map(
		(field) => ({
			field,
			previousValue: previous[field] ?? null,
			newValue: next[field] ?? null,
		}),
	);
}
