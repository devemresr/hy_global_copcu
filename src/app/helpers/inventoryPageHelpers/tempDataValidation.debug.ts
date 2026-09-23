// Ad-hoc data-quality checks for cross-referencing an uploaded/cleaned
// spreadsheet (cleanedRows) against the temp reference dataset (src/app/constants/temp.ts).
//
// This is exploratory/debug tooling, not part of the shipped parse pipeline —
// nothing here is wired into useWorkbookLoader's dispatch. Kept around so the
// same checks can be re-run later without rebuilding them from scratch.
//

import { temp } from '../../constants/temp';
import { PRICING } from '../../constants/pricing.constants';
import type { ExcelRow } from '../../types';
import logger from '../../util/logger';
import { formatMemorySize, parseMemorySize } from './memorySize.helper';
import { normalizeAndFilterRows } from './rowNormalize.helper';
import {
	filterRowsByFields,
	type FieldFilter,
} from './fieldFilter.helper';

export type ModelInfo = {
	BellekTipi: unknown;
	Depoloma: unknown;
};

export type BellekTipiMismatch = {
	model?: string;
	cleanedRowBellekTipi?: unknown;
	tempIcType?: unknown;
	cleanedRowDepoloma?: unknown;
	tempStorage?: unknown;
};

/**
 * End-to-end example of every check/transform in this file, run against one
 * uploaded/cleaned spreadsheet. Not called from anywhere in the app — this is
 * a worked example to copy into a scratch call site (or the console) when you
 * need to re-run the full comparison later. Everything is logged via
 * logger.debug rather than returned, since the point of each step here is to
 * eyeball the numbers, not to feed them into the UI.
 */
export function exampleDataCleaningComparingFunc(cleanedRows: ExcelRow[]) {
	// Step 1: Model -> {BellekTipi, Depoloma} lookup, so temp entries (matched
	// by name) can be compared back to the cleanedRows row that produced them.
	const cleanedRowsByModel = buildCleanedRowsByModel(cleanedRows);

	logger.debug({
		stuffwithEMcp: cleanedRows.filter(
			(i) => i.BellekTipi === 'EMMC' || i.BellekTipi === 'EMCP',
		),
	});

	// Step 2: every reference entry from temp.ts, items and mismatchedResults
	// combined into one flat list (mismatchedResults is nested, hence flat).
	const allTempReferenceEntries: any[] = [
		...temp.items,
		...temp.mismatchedResults.flat(Infinity),
	];

	// Step 3: for every temp entry that matches a cleanedRows model, flag it
	// when either the memory type (BellekTipi/ic_type) or the storage size
	// (Depoloma/storage) disagrees between the two sources.
	const bellekTipiDepolomaMismatches = findBellekTipiDepolomaMismatches(
		cleanedRowsByModel,
		allTempReferenceEntries,
	);
	// Step 4: same mismatches, collapsed down to each distinct
	// (cleanedRowBellekTipi -> tempIcType) pair, e.g. to spot systematic
	// mislabeling like "every UFS in temp is actually EMMC in cleanedRows".
	const uniqueBellekTipiMismatchPairs = findUniqueMismatchPairs(
		bellekTipiDepolomaMismatches,
	);

	logger.debug({
		cleanedRowsByModelCount: cleanedRowsByModel.size,
		bellekTipiDepolomaMismatchesCount: bellekTipiDepolomaMismatches.length,
		uniqueBellekTipiMismatchPairsCount: uniqueBellekTipiMismatchPairs.size,
		uniqueBellekTipiMismatchPairs,
	});

	// Step 5: normalized (uppercased, dash-stripped) model-key set shared by
	// both temp.items and temp.mismatchedResults, and the equivalent set for
	// cleanedRows — used below to check which side is missing which models.
	const tempReferenceModelKeys = buildModelKeySet(temp.items);
	buildModelKeySet(temp.mismatchedResults, tempReferenceModelKeys);
	const cleanedRowModelKeys = buildModelKeySet(cleanedRows);

	// Step 6: cleanedRows entries that have no BellekTipi value at all — rows
	// the spreadsheet never classified.
	const cleanedRowsMissingBellekTipi = getRowsMissingBellekTipi(cleanedRows);

	// Sanity-check log: raw dataset sizes from temp.ts, for eyeballing that
	// nothing came back empty/unexpectedly small.
	logger.debug({
		cleanedRowsCount: cleanedRows.length,
		tempFailedIdsCount: temp.failedIds.length,
		tempItemsCount: temp.items.length,
		tempMatchedIcIDsCount: temp.matchedIcIDs.length,
		tempMismatchedIcIDsCount: temp.mismatchedIcIDs.length,
		tempNoResultIcIDsCount: temp.noResultIcIDs.length,
		tempSuspiciouslyShortNoResultIDsCount:
			temp.suspiciouslyShortNOResultIDs.length,
	});
	logger.debug({
		tempReferenceModelKeysCount: tempReferenceModelKeys.size,
		cleanedRowModelKeysCount: cleanedRowModelKeys.size,
		cleanedRowsMissingBellekTipiCount: cleanedRowsMissingBellekTipi.length,
	});

	// Step 7: cleanedRowsMissingBellekTipi + every temp entry, merged so temp
	// (answered) rows always win over missing-BellekTipi (unanswered) rows on
	// a model collision — see buildFinalData's own comment for why.
	const finalData = buildFinalData(
		cleanedRowsMissingBellekTipi,
		allTempReferenceEntries,
	);
	const finalDataModelKeys = buildModelKeySet(finalData);
	const missingBellekTipiModelKeys = buildModelKeySet(
		cleanedRowsMissingBellekTipi,
	);

	// Step 8: does finalData actually contain every model that was missing a
	// BellekTipi? (it always should, since buildFinalData spreads it in
	// directly — this check exists to catch a future regression, e.g. if
	// buildFinalData's dedup ever started dropping rows unexpectedly.)
	const missingBellekTipiModelsAbsentFromFinalData = diffModelKeySets(
		missingBellekTipiModelKeys,
		finalDataModelKeys,
	);

	logger.debug({
		missingBellekTipiModelKeysCount: missingBellekTipiModelKeys.size,
		missingBellekTipiModelsAbsentFromFinalDataCount:
			missingBellekTipiModelsAbsentFromFinalData.length,
		missingBellekTipiModelsAbsentFromFinalData, // empty array => finalData contains every cleanedRowsMissingBellekTipi model
	});

	// Step 9: does finalData (the temp reference data) cover every model in
	// cleanedRows? A non-empty result means the uploaded spreadsheet has
	// models that don't exist anywhere in the temp reference dataset at all.
	const cleanedRowModelsAbsentFromFinalData = diffModelKeySets(
		cleanedRowModelKeys,
		finalDataModelKeys,
	);
	logger.debug({
		finalDataCount: finalData.length,
		finalDataModelKeysCount: finalDataModelKeys.size,
		cleanedRowModelsAbsentFromFinalDataCount:
			cleanedRowModelsAbsentFromFinalData.length,
	});

	// Step 10: the display-safe version of finalData — BellekTipi normalized
	// onto PRICING's categories, a Fiyat price attached from PRICING, then the
	// example rule below overrides pricing for every "PA"-prefixed model.

	const cleanedFinalData = normalizeAndFilterRows(finalData);
	const cleanedFinalDataMissingBellekTipi = getRowsMissingBellekTipi(finalData);
	logger.debug({
		cleanedFinalDataLen: cleanedFinalData.length,
		finalDataBeforeFilteringLen: finalData.length,
		finalDataAfterTheFilteringLen: cleanedFinalData.length,
		cleanedFinalDataMissingBellekTipiLen:
			cleanedFinalDataMissingBellekTipi.length,
	});
	const displaySafeFinalData = buildDisplaySafeFinalData(cleanedFinalData, {
		overrides: [{ prefix: 'PA', overrides: { Fiyat: '150 TL' } }],
	});

	logger.debug({
		uniqueBellekTipleri: new Set(
			displaySafeFinalData.map((i) => i?.BellekTipi ?? i?.ic_type),
		),
		displaySafeFinalDataLen: displaySafeFinalData.length,
	});

	return displaySafeFinalData;
}

/**
 * Normalizes a model/part-number for matching: uppercased, with dashes
 * stripped so package/date-code suffixes ("08EMCP08-NL3DT227") don't split
 * what's really the same base model into separate keys
 * ("08EMCP08-NL3DT227" -> "08EMCP08NL3DT227").
 */
export function normalizeModelKey(value: unknown): string {
	return String(value ?? '')
		.toUpperCase()
		.replace(/-/g, '');
}

/**
 * Builds Model -> {BellekTipi, Depoloma} so temp entries (matched by name)
 * can be compared back to the cleanedRows row that produced them.
 *
 * NOTE: keyed by plain uppercased Model, WITHOUT dash-stripping — unlike
 * normalizeModelKey/buildModelKeySet below. That inconsistency was present in
 * the original code; if a model with a dash isn't matching here, that's why.
 * Unify onto normalizeModelKey if that turns out to matter.
 */
export function buildCleanedRowsByModel(
	cleanedRows: ExcelRow[],
): Map<string, ModelInfo> {
	const map = new Map<string, ModelInfo>();
	cleanedRows.forEach((row) => {
		const key = String(row?.Model ?? '').toUpperCase();
		if (!key) return;
		map.set(key, {
			BellekTipi: row?.BellekTipi,
			Depoloma: row?.Depoloma,
		});
	});
	return map;
}

/**
 * For each temp entry, looks up the matching cleanedRows row by name/Model
 * and compares storage size (Depoloma vs storage). Rows whose parsed GB
 * values disagree are recorded as mismatches.
 */
export function findBellekTipiDepolomaMismatches(
	cleanedRowsByModel: Map<string, ModelInfo>,
	tempEntries: any[],
): BellekTipiMismatch[] {
	const mismatches: BellekTipiMismatch[] = [];

	tempEntries.forEach((entry) => {
		const key = String(entry?.name ?? '').toUpperCase();
		const match = cleanedRowsByModel.get(key);
		if (!match) return;

		const bellekTipiDiffers =
			String(match.BellekTipi ?? '').toUpperCase() !==
			String(entry?.ic_type ?? '').toUpperCase();
		const depolomaDiffers =
			formatMemorySize(parseMemorySize(match?.Depoloma as string)) !==
			formatMemorySize(parseMemorySize(entry?.storage));

		if (depolomaDiffers || bellekTipiDiffers) {
			mismatches.push({
				model: key,
				cleanedRowDepoloma: match.Depoloma,
				tempStorage: entry?.storage,
				cleanedRowBellekTipi: match?.BellekTipi,
				tempIcType: entry?.ic_type ?? entry?.BellekTipi,
			});
		}
	});

	return mismatches;
}

/** Dedupes mismatches down to each distinct (cleanedRowBellekTipi -> tempIcType) pair. */
export function findUniqueMismatchPairs(
	mismatches: BellekTipiMismatch[],
): Map<string, { cleanedRowBellekTipi: unknown; tempIcType: unknown }> {
	const uniquePairs = new Map<
		string,
		{ cleanedRowBellekTipi: unknown; tempIcType: unknown }
	>();
	mismatches.forEach((i) => {
		const key = `${i.cleanedRowBellekTipi}->${i.tempIcType}`;
		if (!uniquePairs.has(key)) {
			uniquePairs.set(key, {
				cleanedRowBellekTipi: i.cleanedRowBellekTipi,
				tempIcType: i.tempIcType,
			});
		}
	});
	return uniquePairs;
}

/**
 * Adds every element's normalized Model/name into `set` (a fresh Set if none
 * is passed) and returns it. Pass the same Set into multiple calls to
 * accumulate across several source arrays, e.g.:
 *   const ids = buildModelKeySet(temp.items);
 *   buildModelKeySet(temp.mismatchedResults, ids);
 */
export function buildModelKeySet(
	arr: any,
	set: Set<string> = new Set(),
): Set<string> {
	arr.flat(Infinity).forEach((element: any) => {
		set.add(normalizeModelKey(element?.name ?? element?.Model));
	});
	return set;
}

/** cleanedRows entries that have no BellekTipi value at all. */
export function getRowsMissingBellekTipi<
	T extends { BellekTipi?: unknown; ic_type?: unknown },
>(cleanedRows: T[]): T[] {
	return cleanedRows.filter((i) => !i.BellekTipi && !i?.ic_type);
}

/**
 * Dedupes rows by normalizeModelKey (dash-stripped, so "08EMCP08-NL3DT227"
 * and "08EMCP08NL3DT227" collide). When two rows collide, the one whose raw
 * Model actually contains a dash wins — dashed part numbers are the more
 * specific/complete identifier, so that's the one worth keeping over a
 * dash-less duplicate. If neither or both have a dash, the first one seen
 * wins.
 */
export function dedupeByModel<T extends { Model?: unknown }>(rows: T[]): T[] {
	const byKey = new Map<string, T>();

	rows.forEach((row) => {
		const rawModel = String(row?.Model ?? '');
		const key = normalizeModelKey(rawModel);
		if (!key) return;

		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, row);
			return;
		}

		const existingHasDash = String(existing?.Model ?? '').includes('-');
		const currentHasDash = rawModel.includes('-');
		if (currentHasDash && !existingHasDash) {
			byKey.set(key, row);
		}
	});

	return Array.from(byKey.values());
}

/**
 * Combines rows missing BellekTipi with the temp reference data into one
 * array, for set-comparison against cleanedRows.
 *
 * tempEntries are the models the scraper actually answered — they must never
 * be overridden by a dataThatsMissingBellektipi row (a "no answer yet"
 * placeholder that just carries the original spreadsheet fields). A plain
 * dedupeByModel over the concatenated array can't guarantee that on its own:
 * its dash-preference tie-break only looks at whether a Model has a dash, not
 * which source a row came from, so a dash-having "missing" row can outrank a
 * dash-less "answered" row from tempEntries. To avoid that, each side is
 * deduped internally first, then dataThatsMissingBellektipi rows are only
 * kept for models tempEntries never answered at all.
 */
export function buildFinalData(
	dataThatsMissingBellektipi: Array<Record<string, unknown>>,
	tempEntries: any[],
): Array<Record<string, unknown>> {
	const answeredRows = dedupeByModel(
		tempEntries.map(({ name, storage, ic_type, ...rest }: any) => ({
			...rest,
			Model: name,
			Depoloma: storage,
			BellekTipi: ic_type,
		})),
	);
	const answeredModelKeys = buildModelKeySet(answeredRows);

	const unansweredRows = dedupeByModel(dataThatsMissingBellektipi).filter(
		(row) => !answeredModelKeys.has(normalizeModelKey(row?.Model)),
	);

	return [...answeredRows, ...unansweredRows];
}

/** Every normalized key present in `source` but absent from `target`. */
export function diffModelKeySets(
	source: Set<string>,
	target: Set<string>,
): string[] {
	return Array.from(source).filter((key) => !target.has(key));
}

// ---------------------------------------------------------------------------
// Display-safe transform: normalize BellekTipi into a small set of pricing
// categories, look up a price from PRICING by (category, size in GB), then
// let any number of prefix/suffix rules override fields on top of that.
// ---------------------------------------------------------------------------

/**
 * Raw BellekTipi/ic_type values collapse onto the categories PRICING is
 * actually keyed by ("EMMC", "EMCP") — anything not listed here passes
 * through unchanged (uppercased), so categories like uMCP still
 * show up as themselves, just without a price (PRICING has no entry for them).
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
	const gb = parseMemorySize(depoloma as string);
	if (gb === null || gb === undefined) return undefined;
	return PRICING[displayBellekTipi]?.[String(gb)];
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
 * (later rules can override earlier ones). Matching uses normalizeModelKey
 * (uppercased, dashes stripped) on both the row's Model and the rule's
 * prefix/suffix, so a rule written as `prefix: '08EMCP08'` matches
 * "08EMCP08-NL3DT227" just as well as "08EMCP08NL3DT227" — same reasoning as
 * dedupeByModel: dashes shouldn't be able to hide/reveal a match.
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
	/**
	 * Field-based filters run last, after overrides are applied, so a filter
	 * can key off a field an override rule just set (e.g. an overridden
	 * Fiyat). Rows failing any filter are dropped from the result entirely -
	 * this is a genuinely separate concern from overrides, which only ever
	 * mutate a row's fields and never drop rows. See filterRowsByFields.
	 */
	filters?: FieldFilter[];
};

/**
 * Produces the display-safe version of finalData: BellekTipi normalized onto
 * PRICING's categories, a Fiyat field populated from PRICING by (category,
 * size), then any prefix/suffix overrides applied on top for one-off
 * overrides, and finally any field filters applied to drop non-matching rows.
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

