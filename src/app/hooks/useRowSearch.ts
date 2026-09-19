import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { ExcelRow } from '../types';
import {
	buildFuse,
	DEBOUNCE_TIMEOUT,
	detectDateColumns,
} from '../helpers/inventoryPageHelpers/search.helpers';
import { FIELD_NAMES } from '../constants/columnDefinitons.constant';

export const SEARCHABLE_FIELDS = [FIELD_NAMES.MODEL];
const SHOW_EXTENDED_SEARCH_THRESHOLD = 3;
export function useRowSearch(rows: ExcelRow[]) {
	const [query, setQuery] = useState<string>('');
	const [isLoose, setIsLoose] = useState(false);
	const [noResultCount, setNoResultCount] = useState(0);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const countedQueriesRef = useRef<Set<string>>(new Set());

	const handleQuery = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setQuery(value);
		}, DEBOUNCE_TIMEOUT);
	};

	const dateColumns = useMemo(() => detectDateColumns(rows), [rows]);

	const textKeys = useMemo(() => {
		if (rows.length === 0) return [];
		const allKeys = Object.keys(rows[0]);
		const searchableFields = allKeys.filter((key) =>
			SEARCHABLE_FIELDS.includes(key),
		);
		return searchableFields.filter((key) => !dateColumns.includes(key));
	}, [rows, dateColumns]);

	const strictFuse = useMemo(() => {
		if (rows.length === 0) return null;
		return buildFuse(rows, textKeys, 100);
	}, [rows, textKeys]);

	const looseFuse = useMemo(() => {
		if (rows.length === 0) return null;
		return buildFuse(rows, textKeys, 1000);
	}, [rows, textKeys]);

	const activeFuse = isLoose ? looseFuse : strictFuse;

	const strictResults = useMemo(() => {
		if (!query || !strictFuse) return null;
		return strictFuse.search(query);
	}, [query, strictFuse]);

	const searchResults = useMemo(() => {
		if (!query) return null;
		if (!activeFuse) return [];
		return activeFuse.search(query);
	}, [query, activeFuse]);

	const noResults =
		query.length > 0 && strictResults !== null && strictResults.length === 0;

	// increments exactly once per *distinct* no-result query, regardless of re-renders
	useEffect(() => {
		if (noResults && !countedQueriesRef.current.has(query)) {
			countedQueriesRef.current.add(query);
			setNoResultCount((c) => c + 1);
		}
	}, [noResults, query]);

	const showExtendedToggle =
		noResults && noResultCount >= SHOW_EXTENDED_SEARCH_THRESHOLD;

	const toggleExtendedSearch = () => setIsLoose((prev) => !prev);

	return {
		query,
		handleQuery,
		dateColumns,
		searchResults,
		isLoose,
		showExtendedToggle,
		toggleExtendedSearch,
	};
}
