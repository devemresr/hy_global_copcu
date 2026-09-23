import { z } from 'zod';

export const CURRENCY_VALUES = ['TRY', 'USD'] as const;
export const currencySchema = z.enum(CURRENCY_VALUES);
export type Currency = z.infer<typeof currencySchema>;

export const STORAGE_UNIT_VALUES = ['GB', 'TB'] as const;
export const storageUnitSchema = z.enum(STORAGE_UNIT_VALUES);
export type StorageUnit = z.infer<typeof storageUnitSchema>;

// The canonical shape of an item's editable fields and what a valid value
// looks like for each. EditableInventoryItem/EditableField (types.ts),
// FIELD_REGISTRY's editable-field list (fieldRegistry.constant.ts), and every
// edit form's validation (ItemEditModal, FieldEditModal, BulkEditPanel) all
// derive from this instead of re-declaring the field list or re-checking
// "is this a valid price" by hand in each place.
export const editableInventoryItemSchema = z.object({
	model: z.string().trim().min(1, 'Model boş olamaz'),
	bellekTipi: z.string().trim().min(1).nullable().optional(),
	// depolama/depolamaBirimi split the same way fiyat/paraBirimi do: a plain
	// magnitude plus a required unit, instead of a single "128GB" string a
	// filter or sort would have to re-parse.
	depolama: z
		.number({ invalid_type_error: 'Geçerli bir depolama girin' })
		.positive('Geçerli bir depolama girin')
		.nullable(),
	depolamaBirimi: storageUnitSchema,
	ram: z.string().trim().min(1).nullable().optional(),
	fiyat: z
		.number({ invalid_type_error: 'Geçerli bir fiyat girin' })
		.nonnegative('Geçerli bir fiyat girin')
		.nullable(),
	paraBirimi: currencySchema,
});

// A PATCH (single-field or bulk edit) only ever sends the fields it's
// actually changing.
export const updateItemSchema = editableInventoryItemSchema.partial();

export type EditableInventoryItemInput = z.infer<
	typeof editableInventoryItemSchema
>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
