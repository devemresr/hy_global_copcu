import type { ExcelRow } from '../types';
import { useEffect, useMemo } from 'react';
import type { WorkbookAction } from '../wbState.helper';

export type ColumnFilterState = Record<string, Set<string>>;

function normalize(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

// returns unique raw values for a field, deduped case-insensitively,
// keyed by normalized form -> first-seen raw display form
function getUniqueValues(
	rows: ExcelRow[],
	field: string,
	sortFunc: (a: string, b: string) => number,
) {
	const seen = new Map<string, string>();
	for (const r of rows) {
		const raw = r[field];
		if (typeof raw !== 'string') continue;
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;
		const norm = trimmed.toLowerCase();
		if (!seen.has(norm)) seen.set(norm, trimmed);
	}
	return [...seen.values()].sort(sortFunc);
}

export function useColumnFilter(
	field: string,
	rows: ExcelRow[],
	selectedSheet: string,
	columnFiltersBySheet: Record<string, ColumnFilterState>,
	dispatch: React.Dispatch<WorkbookAction>,
	sortFunc: (a: string, b: string) => number = (a, b) => a.localeCompare(b),
) {
	const hasColumn = useMemo(
		() =>
			rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], field),
		[rows, field],
	);

	const uniqueValues = useMemo(
		() => (hasColumn ? getUniqueValues(rows, field, sortFunc) : []),
		[rows, field, hasColumn],
	);

	useEffect(() => {
		if (!selectedSheet || !hasColumn) return;
		dispatch({
			type: 'FILTER_INITIALIZED',
			sheetName: selectedSheet,
			field,
			values: new Set(uniqueValues.map((v) => v.toLowerCase())),
		});
	}, [selectedSheet, hasColumn, uniqueValues, field, dispatch]);

	const selectedValues =
		columnFiltersBySheet[selectedSheet]?.[field] ??
		new Set(uniqueValues.map((v) => v.toLowerCase()));

	const setSelectedValues = (values: Set<string>) => {
		dispatch({
			type: 'FILTER_CHANGED',
			sheetName: selectedSheet,
			field,
			values,
		});
	};

	const matches = (row: ExcelRow): boolean => {
		if (!hasColumn) return true; // this field isn't in the sheet, don't filter on it
		const norm = normalize(row[field]);
		if (norm === null) return false;
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
