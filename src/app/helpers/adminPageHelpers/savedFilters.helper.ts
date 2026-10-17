import { z } from 'zod';
import { FIELD_KEYS, OPS_BY_KIND, fieldMeta, type FieldKey } from '../../constants/fieldRegistry.constant';
import type { FieldFilterOp } from '../inventoryPageHelpers/fieldFilter.helper';

export type SavedCondition = { field: FieldKey; op: FieldFilterOp; value: string };
export type FilterBookmark = { id: string; name: string; conditions: SavedCondition[] };
export const BOOKMARKS_KEY = 'admin.bulkFilterBookmarks.v1';

const conditionSchema = z.object({
	field: z.string().refine((field) => FIELD_KEYS.includes(field as FieldKey) && !['uretici', 'eslesmeTuru', 'sorgulananDeger'].includes(field)),
	op: z.string(),
	value: z.string().max(10000),
}).superRefine((condition, context) => {
	if (!FIELD_KEYS.includes(condition.field as FieldKey)) return;
	if (!OPS_BY_KIND[fieldMeta(condition.field as FieldKey).kind].includes(condition.op as FieldFilterOp)) {
		context.addIssue({ code: 'custom', message: 'Geçersiz filtre işleci' });
	}
	if (!['exists', 'notExists'].includes(condition.op) && !condition.value.trim()) {
		context.addIssue({ code: 'custom', message: 'Filtre değeri boş olamaz' });
	}
});
const conditionsSchema = z.array(conditionSchema).min(1).max(100);
const sharedFilterSchema = z.object({ version: z.literal(1), conditions: conditionsSchema });

export function serializeFilter(conditions: SavedCondition[]): string {
	return JSON.stringify(sharedFilterSchema.parse({ version: 1, conditions }), null, 2);
}

export function parseSharedFilter(text: string): SavedCondition[] {
	return sharedFilterSchema.parse(JSON.parse(text)).conditions as SavedCondition[];
}

export function readFilterBookmarks(): FilterBookmark[] {
	try {
		const stored = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]');
		return z.array(z.object({ id: z.string(), name: z.string().min(1).max(100), conditions: conditionsSchema })).parse(stored) as FilterBookmark[];
	} catch {
		return [];
	}
}
