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
const RECENT_SEARCHES_KEY = 'recentInventorySearches';
const MAX_RECENT_SEARCHES = 10;

export type RecentSearchEntry = { term: string; wasMiss: boolean };

function loadRecentSearches(): RecentSearchEntry[] {
	try {
		const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((entry): RecentSearchEntry | null => {
				if (typeof entry === 'string') return { term: entry, wasMiss: false };
				if (
					entry &&
					typeof entry === 'object' &&
					typeof entry.term === 'string'
				) {
					return { term: entry.term, wasMiss: Boolean(entry.wasMiss) };
				}
				return null;
			})
			.filter((entry): entry is RecentSearchEntry => entry !== null);
	} catch {
		return [];
	}
}

function saveRecentSearches(searches: RecentSearchEntry[]) {
	try {
		localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
	} catch {
		// private browsing, storage full, etc. - recent searches just won't persist
	}
}

export function useRowSearch(rows: ExcelRow[]) {
	const [query, setQuery] = useState<string>('');
	const [isLoose, setIsLoose] = useState(false);
	const [noResultCount, setNoResultCount] = useState(0);
	const [recentSearches, setRecentSearches] =
		useState<RecentSearchEntry[]>(loadRecentSearches);
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

	// records every committed (debounced) search term, most-recent-first,
	// deduped case-insensitively and persisted so history survives a reload.
	// Re-runs (and can flip wasMiss) whenever searchResults changes for the
	// same term too, e.g. toggling extended search turns a miss into a hit.
	useEffect(() => {
		const trimmed = query.trim();
		if (!trimmed) return;
		const wasMiss = searchResults !== null && searchResults.length === 0;
		setRecentSearches((prev) => {
			const withoutDuplicate = prev.filter(
				(s) => s.term.toLowerCase() !== trimmed.toLowerCase(),
			);
			const next = [{ term: trimmed, wasMiss }, ...withoutDuplicate].slice(
				0,
				MAX_RECENT_SEARCHES,
			);
			saveRecentSearches(next);
			return next;
		});
	}, [query, searchResults]);

	// re-runs a past search immediately, bypassing the debounce (it's already
	// a complete term, not something the user is still typing)
	const selectRecentSearch = (value: string) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setQuery(value);
	};

	const removeRecentSearch = (value: string) => {
		setRecentSearches((prev) => {
			const next = prev.filter((s) => s.term !== value);
			saveRecentSearches(next);
			return next;
		});
	};

	return {
		query,
		handleQuery,
		dateColumns,
		searchResults,
		isLoose,
		showExtendedToggle,
		toggleExtendedSearch,
		recentSearches,
		selectRecentSearch,
		removeRecentSearch,
	};
}
