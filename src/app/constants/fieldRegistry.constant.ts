import type { FieldFilterOp } from '../helpers/inventoryPageHelpers/fieldFilter.helper';
import { editableInventoryItemSchema } from '../schemas/item.schema';
import type { EditableField } from '../types';
import { CURRENCY_OPTIONS } from './currency.constant';
import { STORAGE_UNIT_OPTIONS } from './storageUnit.constant';

// Single source of truth for every inventory field the admin UI knows about.
// itemDiff.helper's field list and BulkEditPanel's FILTER_FIELDS/
// ACTION_FIELDS dropdowns used to restate this field list by hand in their
// own file, so a field added to one silently drifted out of sync with the
// others. They now all derive from FIELD_REGISTRY instead - and which of
// these fields are *editable* comes from schemas/item.schema.ts (EditableField
// in types.ts), not a second hand-maintained flag here, so the UI's field
// list and the validation schema's field list can't drift apart either.
// `kind` drives which filter operators are offered per field (see
// OPS_BY_KIND below) - e.g. 'contains'/'gte' don't both make sense on the
// same field, so a string field only offers the former and a number field
// only the latter. `options` marks an enum field's select choices, consumed
// generically by ItemEditModal/FieldEditModal/BulkEditPanel instead of each
// one hardcoding "is this the paraBirimi field" - so a second enum field
// (depolamaBirimi) gets the same select-based UI for free.
export type FieldKind = 'string' | 'number' | 'enum';

export type FieldMeta = {
	label: string;
	kind: FieldKind;
	options?: { value: string; label: string }[];
};

export const FIELD_REGISTRY = {
	model: { label: 'Model', kind: 'string' },
	bellekTipi: { label: 'Bellek Türü', kind: 'string' },
	// depolama/depolamaBirimi split a size like "128GB" into a plain magnitude
	// plus its unit, the same way fiyat/paraBirimi split a price - see
	// schemas/item.schema.ts's comment on editableInventoryItemSchema.
	depolama: { label: 'Depoloma', kind: 'number' },
	depolamaBirimi: {
		label: 'Depolama Birimi',
		kind: 'enum',
		options: STORAGE_UNIT_OPTIONS,
	},
	ram: { label: 'RAM', kind: 'string' },
	fiyat: { label: 'Fiyat', kind: 'number' },
	paraBirimi: {
		label: 'Para Birimi',
		kind: 'enum',
		options: CURRENCY_OPTIONS,
	},
	uretici: { label: 'Üretici', kind: 'string' },
	eslesmeTuru: { label: 'Eşleşme Türü', kind: 'string' },
	sorgulananDeger: { label: 'Sorgulanan Değer', kind: 'string' },
} as const satisfies Record<string, FieldMeta>;

export type FieldKey = keyof typeof FIELD_REGISTRY;

const EDITABLE_SHAPE_KEYS = new Set(
	Object.keys(editableInventoryItemSchema.shape),
);

export const FIELD_KEYS = Object.keys(FIELD_REGISTRY) as FieldKey[];

// Filters against the schema's real runtime keys (not a hand-copied boolean
// per field), so this can only ever match what schemas/item.schema.ts
// actually allows an edit to write.
export const EDITABLE_FIELD_KEYS = FIELD_KEYS.filter(
	(key): key is EditableField => EDITABLE_SHAPE_KEYS.has(key),
);

export function fieldLabel(field: FieldKey): string {
	return FIELD_REGISTRY[field].label;
}

// FIELD_REGISTRY's `as const` keeps each entry's own literal type (so
// paraBirimi's `options` stays typed as CURRENCY_OPTIONS's exact shape rather
// than widening to FieldMeta's generic `{value,label}[]`), which means a
// field without `options` has no such property at all rather than
// `options: undefined` - this widens back to the common FieldMeta shape for
// callers that need to branch on `.kind`/`.options` generically regardless of
// which field they got.
export function fieldMeta(field: FieldKey): FieldMeta {
	return FIELD_REGISTRY[field];
}

// A field whose value is meaningless on its own without a paired unit/
// currency - FieldEditModal shows the pair together in one modal (instead of
// only ever letting an admin change the magnitude and leaving the unit stuck
// at whatever it already was) when it opens for one of these keys.
export const PAIRED_ENUM_FIELD: Partial<Record<EditableField, EditableField>> = {
	depolama: 'depolamaBirimi',
	fiyat: 'paraBirimi',
};

// Which filter operators make sense for each field kind - a fully-string
// field (model, bellekTipi, ...) has no use for gt/gte/lt/lte, and a number
// field (fiyat) has no use for contains.
export const OPS_BY_KIND: Record<FieldKind, FieldFilterOp[]> = {
	string: [
		'equals',
		'notEquals',
		'contains',
		'in',
		'notIn',
		'exists',
		'notExists',
	],
	number: [
		'equals',
		'notEquals',
		'gt',
		'gte',
		'lt',
		'lte',
		'exists',
		'notExists',
	],
	enum: ['equals', 'notEquals', 'in', 'notIn', 'exists', 'notExists'],
};
