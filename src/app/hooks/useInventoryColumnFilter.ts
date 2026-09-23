import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExcelRow } from '../types';

const DEFAULT_EMPTY_VALUE_LABEL = 'Belirtilmemiş';

export interface UseInventoryColumnFilterOptions {
	// Display label standing in for blank/missing values in the dropdown
	// (also what rows with no value get filtered as). Defaults to a generic
	// "unspecified" label; pass a field-specific one for clarity.
	emptyValueLabel?: string;
	// Raw values (case-insensitive, trimmed) to drop entirely — they never
	// appear in the dropdown and rows carrying them are excluded from the
	// grid, regardless of the current filter selection. For junk/test data
	// like a stray "dsa" value, not real domain values.
	excludedValues?: string[];
	// How to read this field's display value off a row, in place of the
	// default `String(row[field]).trim()`. Needed when the field isn't a
	// single string on every row shape - e.g. a DB-backed item's depolama is
	// a plain number with its unit in a sibling depolamaBirimi field, while
	// the bundled static dataset's depolama is already one "128GB" string.
	getValue?: (row: ExcelRow) => string | null;
}

// Trims a string field down to its real value, or null for anything blank/missing.
function trimmedOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

// returns unique display values for a field, deduped case-insensitively.
// Excluded values are dropped entirely; blank/missing values collapse onto
// a single emptyValueLabel entry (appended last) instead of being dropped.
function getUniqueValues(
	rows: ExcelRow[],
	sortFunc: (a: string, b: string) => number,
	emptyValueLabel: string,
	excludedValues: Set<string>,
	getValue: (row: ExcelRow) => string | null,
) {
	const seen = new Map<string, string>();
	let hasEmpty = false;

	for (const r of rows) {
		const trimmed = getValue(r);
		if (trimmed === null) {
			hasEmpty = true;
			continue;
		}
		const norm = trimmed.toLowerCase();
		if (excludedValues.has(norm)) continue;
		if (!seen.has(norm)) seen.set(norm, trimmed);
	}

	const values = [...seen.values()].sort(sortFunc);
	if (hasEmpty) values.push(emptyValueLabel);
	return values;
}

// Single-dataset column filter backed by local component state.
export function useInventoryColumnFilter(
	field: string,
	rows: ExcelRow[],
	sortFunc: (a: string, b: string) => number = (a, b) => a.localeCompare(b),
	options?: UseInventoryColumnFilterOptions,
) {
	const emptyValueLabel = options?.emptyValueLabel ?? DEFAULT_EMPTY_VALUE_LABEL;
	const excludedValuesList = options?.excludedValues;
	const excludedValues = useMemo(
		() =>
			new Set((excludedValuesList ?? []).map((v) => v.trim().toLowerCase())),
		[excludedValuesList],
	);
	const optionsGetValue = options?.getValue;
	const getValue = useMemo(
		() => optionsGetValue ?? ((row: ExcelRow) => trimmedOrNull(row[field])),
		[optionsGetValue, field],
	);

	const hasColumn = useMemo(
		() =>
			rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], field),
		[rows, field],
	);

	const uniqueValues = useMemo(
		() =>
			hasColumn
				? getUniqueValues(
						rows,
						sortFunc,
						emptyValueLabel,
						excludedValues,
						getValue,
					)
				: [],
		[rows, hasColumn, sortFunc, emptyValueLabel, excludedValues, getValue],
	);

	const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());
	// mirrors the reducer's FILTER_INITIALIZED: seed the selection once the
	// column's values are known, but never clobber a selection the user made.
	const initializedRef = useRef(false);

	useEffect(() => {
		if (!hasColumn || initializedRef.current) return;
		setSelectedValues(new Set(uniqueValues.map((v) => v.toLowerCase())));
		initializedRef.current = true;
	}, [hasColumn, uniqueValues]);

	const matches = (row: ExcelRow): boolean => {
		if (!hasColumn) return true; // this field isn't in the data, don't filter on it
		const trimmed = getValue(row);
		if (trimmed !== null && excludedValues.has(trimmed.toLowerCase())) {
			return false; // junk/test value, hard-excluded regardless of selection
		}
		const norm =
			trimmed === null ? emptyValueLabel.toLowerCase() : trimmed.toLowerCase();
		return selectedValues.has(norm);
	};

	return {
		hasColumn,
		uniqueValues,
		selectedValues,
		setSelectedValues,
		matches,
		field,
	};
}
