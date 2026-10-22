import { extractLeadingNumber, parseSizeGb } from './memorySize.helper';

// Generic field filtering: query rows by any field's presence/absence or by
// a value/numeric comparison. Shared by the display-safe transform
// (displaySafe.helper.ts) and the admin bulk-edit rule builder
// (component/admin/BulkEditPanel.tsx) - it's plain data-shape logic with no
// dependency on either caller, so it lives on its own rather than inside one
// of them.

export type FieldFilterOp =
	/** The field has a value. */
	| 'exists'
	/** The field has no value (missing, null, or blank). */
	| 'notExists'
	/** The field's value equals `value` (case-insensitive). */
	| 'equals'
	/** The field's value does not equal `value`. */
	| 'notEquals'
	// value is an array here, not a single value. equals/notEquals can't do
	// this job: they compare against String(value), so an array would just
	// get stringified into one joined "a,b,c" and compared as that literal
	// string, instead of checking membership.
	/** The field's value is one of the values in the `value` array (case-insensitive). */
	| 'in'
	/** The field's value is none of the values in the `value` array. */
	| 'notIn'
	/** The field's value contains `value` as a substring (case-insensitive). */
	| 'contains'
	| 'notContains'
	| 'lengthEquals'
	| 'lengthGt'
	| 'lengthGte'
	| 'lengthLt'
	| 'lengthLte'
	/** The field's value is greater than `value`, numerically. */
	| 'gt'
	/** The field's value is greater than or equal to `value`, numerically. */
	| 'gte'
	/** The field's value is less than `value`, numerically. */
	| 'lt'
	/** The field's value is less than or equal to `value`, numerically. */
	| 'lte';

export type FieldFilter = {
	field: string;
	op: FieldFilterOp;
	/** Required for every op except 'exists'/'notExists'. Array for 'in'/'notIn'. */
	value?: unknown;
	/**
	 * gt/gte/lt/lte only: compare as memory sizes in GB ("1 Tb" -> 1024) via
	 * parseSizeGb instead of a unit-agnostic leading number. Set this for a
	 * field whose text carries a size unit, e.g.
	 * { field: 'Depoloma', op: 'gt', value: 128, sizeAware: true }.
	 */
	sizeAware?: boolean;
};

/** True for anything meaningfully "there": not missing, not null/undefined, not a blank string. */
function fieldHasValue(row: Record<string, unknown>, field: string): boolean {
	if (!Object.prototype.hasOwnProperty.call(row, field)) return false;
	const value = row[field];
	if (value === null || value === undefined) return false;
	if (typeof value === 'string') return value.trim().length > 0;
	return true;
}

/** Size-comparison operand in GB; a plain number is taken as GB already. */
function resolveSizeGb(value: unknown): number | null {
	if (typeof value === 'number') return Number.isNaN(value) ? null : value;
	return parseSizeGb(value);
}

/** Whether a single row satisfies a single field filter. */
export function matchesFieldFilter(
	row: Record<string, unknown>,
	filter: FieldFilter,
): boolean {
	const hasValue = fieldHasValue(row, filter.field);

	switch (filter.op) {
		case 'lengthEquals':
		case 'lengthGt':
		case 'lengthGte':
		case 'lengthLt':
		case 'lengthLte': {
			if (filter.field !== 'model' || !hasValue || typeof row.model !== 'string') return false;
			const raw = filter.value;
			if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^\d+$/.test(raw.trim()))) return false;
			const target = Number(raw);
			if (!Number.isSafeInteger(target) || target < 0) return false;
			const length = Array.from(row.model.trim()).length;
			if (filter.op === 'lengthEquals') return length === target;
			if (filter.op === 'lengthGt') return length > target;
			if (filter.op === 'lengthGte') return length >= target;
			if (filter.op === 'lengthLt') return length < target;
			return length <= target;
		}
		case 'exists':
			return hasValue;
		case 'notExists':
			return !hasValue;
		case 'equals':
			return (
				hasValue &&
				String(row[filter.field]).toLowerCase() ===
					String(filter.value).toLowerCase()
			);
		case 'notEquals':
			return (
				!hasValue ||
				String(row[filter.field]).toLowerCase() !==
					String(filter.value).toLowerCase()
			);
		case 'in':
		case 'notIn': {
			const candidates = Array.isArray(filter.value)
				? filter.value
				: [filter.value];
			const normalized = new Set(
				candidates.map((v) => String(v).toLowerCase()),
			);
			const isMember =
				hasValue && normalized.has(String(row[filter.field]).toLowerCase());
			return filter.op === 'in' ? isMember : !isMember;
		}
		case 'contains':
		case 'notContains': {
			const contains = (
				hasValue &&
				String(row[filter.field])
					.toLowerCase()
					.includes(String(filter.value).toLowerCase())
			);
			return filter.op === 'contains' ? contains : !contains;
		}
		case 'gt':
		case 'gte':
		case 'lt':
		case 'lte': {
			const resolve = filter.sizeAware ? resolveSizeGb : extractLeadingNumber;
			const rowValue = resolve(row[filter.field]);
			const target = resolve(filter.value);
			if (rowValue === null || target === null) return false;
			if (filter.op === 'gt') return rowValue > target;
			if (filter.op === 'gte') return rowValue >= target;
			if (filter.op === 'lt') return rowValue < target;
			return rowValue <= target;
		}
	}
}

/**
 * Keeps only rows matching every filter (AND semantics across the list).
 * Example: rows missing a price, or rows with Depoloma over 128GB (sizeAware
 * so "1 Tb" compares as 1024, not 1 - see FieldFilter's doc comment):
 *   filterRowsByFields(rows, [{ field: 'Fiyat', op: 'notExists' }]);
 *   filterRowsByFields(rows, [
 *     { field: 'Depoloma', op: 'gt', value: 128, sizeAware: true },
 *   ]);
 */
export function filterRowsByFields<T extends Record<string, unknown>>(
	rows: T[],
	filters: FieldFilter[],
): T[] {
	return rows.filter((row) =>
		filters.every((filter) => matchesFieldFilter(row, filter)),
	);
}
