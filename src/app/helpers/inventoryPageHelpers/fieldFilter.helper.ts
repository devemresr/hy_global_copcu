import { extractLeadingNumber, parseMemorySize } from './memorySize.helper';

// Generic field filtering: query rows by any field's presence/absence or by
// a value/numeric comparison. Shared by the debug data-cleaning pipeline
// (tempDataValidation.debug.ts) and the admin bulk-edit rule builder
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
	 * gt/gte/lt/lte only: parse both the row's value and `value` as memory
	 * sizes ("1 Tb" -> 1024) via parseMemorySize instead of a unit-agnostic
	 * leading number. gt/gte/lt/lte stay unit-agnostic by default (see
	 * extractLeadingNumber's doc comment for why "500 TL" can't safely be run
	 * through unit parsing) - set this for a field that does carry a size
	 * unit, e.g. { field: 'Depoloma', op: 'gt', value: 128, sizeAware: true }.
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

/**
 * Resolves a size-comparison operand to a GB value. Strings go through
 * parseMemorySize (so "1 Tb" -> 1024, "256GB NAND" -> 256); a plain number
 * is treated as already being GB - the unit parseMemorySize itself
 * normalizes to - so a filter can be written as
 * `{ field: 'Depoloma', op: 'gt', value: 128, sizeAware: true }` without
 * spelling out a unit on the comparison value.
 */
function resolveSizeGb(value: unknown): number | null {
	if (typeof value === 'number') return Number.isNaN(value) ? null : value;
	if (typeof value === 'string') return parseMemorySize(value) ?? null;
	return null;
}

/** Whether a single row satisfies a single field filter. */
export function matchesFieldFilter(
	row: Record<string, unknown>,
	filter: FieldFilter,
): boolean {
	const hasValue = fieldHasValue(row, filter.field);

	switch (filter.op) {
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
			return (
				hasValue &&
				String(row[filter.field])
					.toLowerCase()
					.includes(String(filter.value).toLowerCase())
			);
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
