import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { ExcelRow } from '../types';
import {
	buildFuse,
	DEBOUNCE_TIMEOUT,
	detectDateColumns,
	parseDateQuery,
} from '../search.helpers';

export function useRowSearch(rows: ExcelRow[]) {
	const [query, setQuery] = useState<string>('');
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleQuery = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			setQuery(value);
		}, DEBOUNCE_TIMEOUT);
	};

	const dateColumns = useMemo(() => detectDateColumns(rows), [rows]);

	const fuse = useMemo(() => {
		if (rows.length === 0) return null;
		const allKeys = Object.keys(rows[0]);
		const textKeys = allKeys.filter((key) => !dateColumns.includes(key));
		return buildFuse(rows, textKeys);
	}, [rows, dateColumns]);

	const searchResults = useMemo(() => {
		if (!query) return null;
		const dateRange = dateColumns.length > 0 ? parseDateQuery(query) : null;
		if (dateRange) return null;
		if (!fuse) return [];

		const results = fuse.search(query);
		return results;
	}, [query, fuse, rows, dateColumns]);

	return { query, handleQuery, dateColumns, searchResults };
}
