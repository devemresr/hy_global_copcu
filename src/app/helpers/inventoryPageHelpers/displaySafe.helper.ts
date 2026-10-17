// Display-safe transform: normalize BellekTipi into a small set of pricing
// categories, look up a price from PRICING by (category, size in GB), then
// let any number of prefix/suffix rules override fields on top of that, and
// finally drop rows that fail any field filter.
//
// Overrides and filters are separate on purpose: overrides only ever mutate a
// row's fields, filters only ever drop rows. Filters run last so they can key
// off a field an override just set (e.g. an overridden Fiyat).

import { PRICING } from '../../constants/pricing.constants';
import { parseSizeGb } from './memorySize.helper';
import { filterRowsByFields, type FieldFilter } from './fieldFilter.helper';

/**
 * Normalizes a model/part-number for matching: uppercased, with dashes
 * stripped, e.g. "08EMCP08-NL3DT227" -> "08EMCP08NL3DT227".
 */
export function normalizeModelKey(value: unknown): string {
	return String(value ?? '')
		.toUpperCase()
		.replace(/-/g, '');
}

/**
 * Raw BellekTipi/ic_type values collapse onto the categories PRICING is
 * keyed by ("EMMC", "EMCP"). Anything not listed passes through uppercased,
 * so e.g. uMCP still shows up as itself, just without a price.
 */
const BELLEK_TIPI_DISPLAY_MAP: Record<string, string> = {
	EMMC: 'EMMC',
	UFS: 'EMMC',
	EMCP: 'EMCP',
	EMMP: 'EMCP',
	MCP: 'EMCP',
};

export function normalizeBellekTipiForDisplay(raw: unknown): string {
	const upper = String(raw ?? '').toUpperCase();
	return BELLEK_TIPI_DISPLAY_MAP[upper] ?? upper;
}

/**
 * Looks up a price from PRICING by display category + parsed GB size.
 * Returns undefined when the category has no pricing table (e.g. UMCP) or
 * the size doesn't parse / has no entry (e.g. an unusual capacity).
 */
export function getDisplayPrice(
	displayBellekTipi: string,
	depoloma: unknown,
): string | undefined {
	const gb = parseSizeGb(depoloma);
	return gb === null ? undefined : PRICING[displayBellekTipi]?.[String(gb)];
}

export type DisplayOverrideRule = {
	/** Model prefix to match, case-insensitive. Omit to skip the prefix check. */
	prefix?: string;
	/** Model suffix to match, case-insensitive. Omit to skip the suffix check. */
	suffix?: string;
	/** Fields to overwrite on the row when both prefix and suffix (whichever are set) match. */
	overrides: Record<string, unknown>;
};

/**
 * Applies every matching rule's overrides onto the row, in array order
 * (later rules can override earlier ones). Matching runs normalizeModelKey on
 * both sides, so `prefix: '08EMCP08'` matches "08EMCP08-NL3DT227" too.
 */
export function applyDisplayOverrideRules(
	row: Record<string, unknown>,
	rules: DisplayOverrideRule[],
): Record<string, unknown> {
	const model = normalizeModelKey(row?.Model);

	return rules.reduce<Record<string, unknown>>((current, rule) => {
		const prefixMatches = rule.prefix
			? model.startsWith(normalizeModelKey(rule.prefix))
			: true;
		const suffixMatches = rule.suffix
			? model.endsWith(normalizeModelKey(rule.suffix))
			: true;
		if (!prefixMatches || !suffixMatches) return current;
		return { ...current, ...rule.overrides };
	}, row);
}

export type BuildDisplaySafeFinalDataRules = {
	/** Prefix/suffix-matched field overrides - see applyDisplayOverrideRules. */
	overrides?: DisplayOverrideRule[];
	/** Field filters, run after overrides. See filterRowsByFields. */
	filters?: FieldFilter[];
};

/**
 * Produces the display-safe version of the rows: BellekTipi normalized onto
 * PRICING's categories, a Fiyat field populated from PRICING by (category,
 * size), then overrides applied, then filters.
 */
export function buildDisplaySafeFinalData(
	finalData: Array<Record<string, unknown>>,
	rules: BuildDisplaySafeFinalDataRules = {},
): Array<Record<string, unknown>> {
	const displayRows = finalData.map((row) => {
		const displayBellekTipi = normalizeBellekTipiForDisplay(row?.BellekTipi);
		const displayRow = {
			...row,
			BellekTipi: displayBellekTipi,
			Fiyat: getDisplayPrice(displayBellekTipi, row?.Depoloma),
		};
		return applyDisplayOverrideRules(displayRow, rules.overrides ?? []);
	});

	return rules.filters && rules.filters.length > 0
		? filterRowsByFields(displayRows, rules.filters)
		: displayRows;
}
