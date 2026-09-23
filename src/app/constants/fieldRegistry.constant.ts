import type { FieldFilterOp } from '../helpers/inventoryPageHelpers/fieldFilter.helper';
import { editableInventoryItemSchema } from '../schemas/item.schema';
import type { EditableField } from '../types';
import type { Steppers } from '../component/NumberInputWithSteppers';
import { CURRENCY_OPTIONS } from './currency.constant';
import { STORAGE_UNIT_OPTIONS } from './storageUnit.constant';

// Single source of truth for every inventory field the admin UI knows about.
// itemDiff.helper's field list and BulkEditPanel's FILTER_FIELDS/
// ACTION_FIELDS dropdowns used to restate this field list by hand in their
// own file, so a field added to one silently drifted out of sync with the
// others. They now all derive from FIELD_REGISTRY instead - and which of
// these fields are *editable* comes from schemas/item.schema.ts (EditableField
// in types.ts), not a second hand-maintained flag here (see
// EDITABLE_FIELD_KEYS below), so the UI's field list and the validation
// schema's field list can't drift apart either.
// `kind` drives which filter operators are offered per field (see
// OPS_BY_KIND below) - e.g. 'contains'/'gte' don't both make sense on the
// same field, so a string field only offers the former and a number field
// only the latter. `options` marks an enum field's select choices, consumed
// generically by ItemEditModal/FieldEditModal/BulkEditPanel instead of each
// one hardcoding "is this the paraBirimi field" - depolama/fiyat each split
// into a plain magnitude plus a required unit (depolamaBirimi/paraBirimi),
// and both units get the same select-based UI for free this way.
export type FieldKind = 'string' | 'number' | 'enum';

export type FieldMeta = {
	label: string;
	kind: FieldKind;
	options?: { value: string; label: string }[];
	// A number-kind field's NumberInputWithSteppers +buttons - depolama steps
	// in GB-sized increments, fiyat in currency-sized ones, so each field
	// declares its own instead of every usage site hardcoding the same pair.
	stepperValues?: Steppers;
};

export const FIELD_REGISTRY = {
	model: { label: 'Model', kind: 'string' },
	bellekTipi: { label: 'Bellek Türü', kind: 'string' },
	depolama: {
		label: 'Depoloma',
		kind: 'number',
		stepperValues: [
			{ amount: 8, label: '+8' },
			{ amount: 16, label: '+16' },
		],
	},
	depolamaBirimi: {
		label: 'Depolama Birimi',
		kind: 'enum',
		options: STORAGE_UNIT_OPTIONS,
	},
	ram: { label: 'RAM', kind: 'string' },
	fiyat: {
		label: 'Fiyat',
		kind: 'number',
		stepperValues: [
			{ amount: 10, label: '+10' },
			{ amount: 100, label: '+100' },
		],
	},
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

// Filters against the schema's real runtime keys, per this file's header note.
export const EDITABLE_FIELD_KEYS = FIELD_KEYS.filter(
	(key): key is EditableField => EDITABLE_SHAPE_KEYS.has(key),
);

export function fieldLabel(field: FieldKey): string {
	return FIELD_REGISTRY[field].label;
}

// Widens FIELD_REGISTRY's per-entry literal type (a field without `options`
// has no such property at all, not `options: undefined`) to the common
// FieldMeta shape, for callers branching on `.kind`/`.options` generically.
export function fieldMeta(field: FieldKey): FieldMeta {
	return FIELD_REGISTRY[field];
}

// A field whose value is meaningless without its paired unit/currency;
// FieldEditModal edits both together when it opens for one of these keys.
export const PAIRED_ENUM_FIELD: Partial<Record<EditableField, EditableField>> =
	{
		depolama: 'depolamaBirimi',
		fiyat: 'paraBirimi',
	};

// Whether clearing a field to null is something the schema even allows -
// `model`/`depolamaBirimi`/`paraBirimi` are required, so a "delete this
// field" action never makes sense for them (it would just fail validation).
export function isFieldNullable(field: EditableField): boolean {
	return editableInventoryItemSchema.shape[field].safeParse(null).success;
}

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
