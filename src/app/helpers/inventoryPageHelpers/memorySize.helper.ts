// Shared "how big is this memory chip" parsing, used both to clean uploaded
// rows (normalizeAndFilterRows) and to compare them against the temp
// reference data (tempDataValidation.debug.ts). Kept in one place so both
// sides always agree on what counts as "the same" storage size.

import type { StorageUnit } from '../../schemas/item.schema';

/**
 * Pulls the leading numeric portion out of a free-form string or number,
 * e.g. "256GB NAND" -> 256, "500 TL" -> 500, "8" -> 8. Purely numeric, no
 * unit awareness - shared by parseMemorySize below (which additionally
 * requires and converts a M/G/T unit) and by plain numeric field
 * comparisons (tempDataValidation.debug.ts's matchesFieldFilter) where
 * there's no unit to convert, like Fiyat. Deliberately kept unit-agnostic:
 * a value like "500 TL" would misparse as Terabytes if run through
 * parseMemorySize's unit matching, since "TL" also starts with "T".
 */
export function extractLeadingNumber(raw: unknown): number | null {
	if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw;
	if (typeof raw !== 'string') return null;
	const match = raw.trim().match(/-?\d+(?:\.\d+)?/);
	return match ? parseFloat(match[0]) : null;
}

export function toGb(num: number, unit: string) {
	if (unit === 'G') return num;
	if (unit === 'T') return num * 1024;
}

/**
 * Extracts a GB value from a free-form size string. Not anchored to the full
 * string on purpose: values coming from the temp dataset look like
 * "256GB NAND" or "128GB TLC NAND" (a size followed by a descriptor), so this
 * grabs the leading "<number><unit>" and ignores whatever follows it.
 */
export function parseMemorySize(raw: string) {
	if (raw === undefined || raw === null) return null;
	const s = String(raw).trim();
	if (!s || s === '?') return null;

	const simple = s.match(/(\d+(?:\.\d+)?)\s*([MGT])B?/i);
	if (!simple) return null; // unparseable returned for manual review

	const num = extractLeadingNumber(simple[1]);
	if (num === null) return null;
	return toGb(num, simple[2].toUpperCase());
}

/**
 * Splits a free-form size string like "128GB" or "1 TB" into its magnitude
 * and the unit it was actually expressed in - unlike parseMemorySize, which
 * always normalizes to a GB number and throws the original unit away. Used
 * once, by the DB seed script, to migrate the bundled dataset's single
 * depolama string into the Item model's separate depolama/depolamaBirimi
 * fields. Only recognizes G/T (the two units depolamaBirimi's schema
 * allows) - an M-unit source string simply won't match, same as an
 * otherwise-unparseable one.
 */
export function parseStorageSize(
	raw: string,
): { value: number; unit: StorageUnit } | null {
	const s = String(raw ?? '').trim();
	if (!s || s === '?') return null;

	const match = s.match(/(\d+(?:\.\d+)?)\s*([GT])B?/i);
	if (!match) return null;

	const value = extractLeadingNumber(match[1]);
	if (value === null) return null;
	return { value, unit: match[2].toUpperCase() === 'T' ? 'TB' : 'GB' };
}

// Accepts null/undefined because parseMemorySize can return either (unparseable
// input) and callers compare formatMemorySize(parseMemorySize(x)) directly —
// behavior for those cases (falls through to `${gbValue} Gb`) is unchanged
// from before this was split out, only the signature is now honest about it.
export function formatMemorySize(gbValue: number | null | undefined) {
	if (
		gbValue !== null &&
		gbValue !== undefined &&
		gbValue >= 1024 &&
		gbValue % 1024 === 0
	) {
		return `${gbValue / 1024} Tb`;
	}
	return `${gbValue} Gb`;
}
