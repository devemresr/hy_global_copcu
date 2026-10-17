// Shared "how big is this memory chip" parsing, used to clean uploaded rows
// (rowNormalize.helper.ts), price them (displaySafe.helper.ts), filter them by
// size (fieldFilter.helper.ts) and by the server's import scripts. Kept in one
// place so every caller agrees on what counts as "the same" storage size.
//
// parseSize is the only function that reads a size out of text; the rest
// build on its result, one job each:
//   parseSize    "1 TB"            -> { value: 1, unit: 'TB' }  (keeps the unit)
//   toGb         { 1, 'TB' }       -> 1024
//   parseSizeGb  "1 TB"            -> 1024                      (parseSize + toGb)
//   formatGb     1024              -> "1 Tb"
//
// Not anchored to the full string: uploaded values look like "256GB NAND" or
// "128GB TLC NAND", so the first "<number><unit>" wins and the rest is ignored.
// A bare M/G/T (no B) can't be followed by another letter, though - otherwise
// "64 TLC" or "500 TL" would read as terabytes. extractLeadingNumber is the
// unit-agnostic counterpart for fields that have no size unit, like Fiyat.

import type { StorageUnit } from '../../schemas/item.schema';

export type SizeUnit = 'MB' | StorageUnit;
export type ParsedSize = { value: number; unit: SizeUnit };

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*([MGT])(?:B|(?![a-z]))/i;

const GB_PER_UNIT: Record<SizeUnit, number> = {
	MB: 1 / 1024,
	GB: 1,
	TB: 1024,
};

/** Leading number of a free-form value, no unit handling: "500 TL" -> 500. */
export function extractLeadingNumber(raw: unknown): number | null {
	if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw;
	if (typeof raw !== 'string') return null;
	const match = raw.match(/-?\d+(?:\.\d+)?/);
	return match ? parseFloat(match[0]) : null;
}

/** Size and the unit it was written in: "256GB NAND" -> { 256, 'GB' }. */
export function parseSize(raw: unknown): ParsedSize | null {
	const match = String(raw ?? '').match(SIZE_PATTERN);
	if (!match) return null; // unparseable - left for manual review
	return {
		value: parseFloat(match[1]),
		unit: `${match[2].toUpperCase()}B` as SizeUnit,
	};
}

export function toGb({ value, unit }: ParsedSize): number {
	return value * GB_PER_UNIT[unit];
}

/** Size normalized to GB: "1 Tb" -> 1024. Null when unparseable. */
export function parseSizeGb(raw: unknown): number | null {
	const size = parseSize(raw);
	return size ? toGb(size) : null;
}

/** Display form; whole terabytes collapse to Tb: 1024 -> "1 Tb", 256 -> "256 Gb". */
export function formatGb(gb: number): string {
	return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} Tb` : `${gb} Gb`;
}
