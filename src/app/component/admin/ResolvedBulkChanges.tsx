import type { EditableInventoryItem } from '../../types';
import { findBulkRuleConflicts, type ItemRule } from '../../helpers/adminPageHelpers/itemRules.helper';
import { EDITABLE_FIELD_KEYS, PAIRED_ENUM_FIELD, fieldLabel } from '../../constants/fieldRegistry.constant';
import { DisplayValue } from './DisplayValue';

export function ResolvedBulkChanges({ item, fields, rules, highlighted = true }: { item: Parameters<typeof findBulkRuleConflicts>[0]; fields: Partial<EditableInventoryItem>; rules: readonly ItemRule[]; highlighted?: boolean }) {
	const conflicts = findBulkRuleConflicts(item, fields, rules);
	const next = { ...item, ...fields };
	return <>{EDITABLE_FIELD_KEYS.filter((field) => Object.hasOwn(fields, field)).map((field) => <span key={field} className={highlighted ? 'block rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300' : 'block text-xs opacity-70'}>
		{fieldLabel(field)}: <DisplayValue value={item[field] ?? null} /> {PAIRED_ENUM_FIELD[field] ? item[PAIRED_ENUM_FIELD[field]!] : ''} → <DisplayValue value={next[field] ?? null} /> {PAIRED_ENUM_FIELD[field] ? next[PAIRED_ENUM_FIELD[field]!] : ''}
		{conflicts.filter((conflict) => conflict.field === field).map((conflict) => <span key={field} className='ml-2 font-medium text-red-600 dark:text-red-400'>Kural: {conflict.ruleName} (<DisplayValue value={conflict.ruleValue} />). Ayrı onay gerekir.</span>)}
	</span>)}</>;
}
