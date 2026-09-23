import type { EditableInventoryItem, FieldChange } from '../../types';
import { EDITABLE_FIELD_KEYS } from '../../constants/fieldRegistry.constant';

export function diffEditableItem(
	previous: EditableInventoryItem,
	next: EditableInventoryItem,
): FieldChange[] {
	return EDITABLE_FIELD_KEYS.filter(
		(field) => previous[field] !== next[field],
	).map(
		(field) => ({
			field,
			previousValue: previous[field] ?? null,
			newValue: next[field] ?? null,
		}),
	);
}
