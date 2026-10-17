import type { EditableField, EditableInventoryItem } from '../../types';
import { fieldMeta } from '../../constants/fieldRegistry.constant';
import { editableInventoryItemSchema } from '../../schemas/item.schema';

export type BulkAction = { field: EditableField; value: string };

export function buildBulkFields(actions: BulkAction[]): Partial<EditableInventoryItem> {
	if (!actions.length) throw new Error('En az bir alan seçin');
	const fields: Record<string, unknown> = {};
	for (const { field, value } of actions) {
		const meta = fieldMeta(field);
		if (Object.hasOwn(fields, field)) throw new Error(`${meta.label}: Alan birden fazla seçilemez`);
		const candidate = meta.kind === 'number'
			? (value.trim() === '' ? null : Number(value))
			: meta.kind === 'enum' ? value : value.trim() || null;
		const parsed = editableInventoryItemSchema.shape[field].safeParse(candidate);
		if (!parsed.success) throw new Error(`${meta.label}: ${parsed.error.issues[0].message}`);
		fields[field] = parsed.data ?? null;
	}
	return fields as Partial<EditableInventoryItem>;
}
