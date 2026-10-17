import { z } from 'zod';
import type { EditableField, EditableInventoryItem } from '../../types';
import { EDITABLE_FIELD_KEYS } from '../../constants/fieldRegistry.constant';
import { buildBulkFields, type BulkAction } from './bulkEdit.helper';
import { conditionsToFilters } from './filterConditions.helper';
import { parseSharedFilter, serializeFilter, type SavedCondition } from './savedFilters.helper';
import { matchesFieldFilter } from '../inventoryPageHelpers/fieldFilter.helper';

export type ItemRule = {
	id: string;
	name: string;
	enabled: boolean;
	conditions: SavedCondition[];
	actions: BulkAction[];
};
export const ITEM_RULES_KEY = 'admin.itemCreationRules.v1';

const storedRuleSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(100),
	enabled: z.boolean(),
	conditions: z.array(z.object({ field: z.string(), op: z.string(), value: z.string() })),
	actions: z.array(z.object({ field: z.string().refine((field) => EDITABLE_FIELD_KEYS.includes(field as EditableField)), value: z.string() })).min(1),
});

export function validateItemRule(input: unknown): ItemRule {
	const parsed = storedRuleSchema.parse(input);
	const conditions = parseSharedFilter(serializeFilter(parsed.conditions as SavedCondition[]));
	buildBulkFields(parsed.actions as BulkAction[]);
	return { ...parsed, conditions, actions: parsed.actions as BulkAction[] };
}

export function loadItemRules(): ItemRule[] {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(ITEM_RULES_KEY) ?? '[]');
		return z.array(z.unknown()).parse(stored).map(validateItemRule);
	} catch { return []; }
}

export type RuleResolution = {
	item: EditableInventoryItem;
	sources: Partial<Record<EditableField, ItemRule>>;
};

/** One ordered pass. Higher rules win each field; lower rules see defaults
 * already supplied by earlier rules. No effects or recursive rule evaluation.
 * Used for creation drafts only, never for existing-item edits.
 */
export function resolveItemRules(draft: EditableInventoryItem, rules: readonly ItemRule[], overrides: ReadonlySet<EditableField> = new Set()): RuleResolution {
	const item = { ...draft };
	const sources: RuleResolution['sources'] = {};
	for (const rule of rules) {
		if (!rule.enabled || !rule.conditions.length) continue;
		if (!conditionsToFilters(rule.conditions).every((filter) => matchesFieldFilter(item, filter))) continue;
		const fields = buildBulkFields(rule.actions);
		for (const field of Object.keys(fields) as EditableField[]) {
			if (sources[field]) continue;
			sources[field] = rule;
			if (!overrides.has(field)) Object.assign(item, { [field]: fields[field] });
		}
	}
	return { item, sources };
}
