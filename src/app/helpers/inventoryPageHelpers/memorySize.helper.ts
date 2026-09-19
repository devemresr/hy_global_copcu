// Shared "how big is this memory chip" parsing, used both to clean uploaded
// rows (normalizeAndFilterRows) and to compare them against the temp
// reference data (tempDataValidation.debug.ts). Kept in one place so both
// sides always agree on what counts as "the same" storage size.

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
	if (simple) {
		return toGb(parseFloat(simple[1]), simple[2].toUpperCase());
	}

	return null; // unparseable returned for manual review
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
