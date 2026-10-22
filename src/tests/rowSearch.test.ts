import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useRowSearch } from '../app/hooks/useRowSearch';
import type { ExcelRow } from '../app/types';

let root: Root;
let container: HTMLDivElement;
let search: ReturnType<typeof useRowSearch>;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function Harness({ rows }: { rows: ExcelRow[] }) {
	const result = useRowSearch(rows);
	useEffect(() => { search = result; }, [result]);
	return null;
}
function render(rows: ExcelRow[] = [{ model: 'ABC123' }]) {
	act(() => root.render(createElement(Harness, { rows })));
}
beforeEach(() => {
	localStorage.clear();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); });

describe('inventory search history', () => {
	it('deduplicates committed searches and persists their latest spelling', () => {
		render();
		act(() => search.selectRecentSearch('ABC123'));
		act(() => search.selectRecentSearch('abc123'));
		expect(search.recentSearches).toEqual([{ term: 'abc123', wasMiss: false }]);
		expect(JSON.parse(localStorage.getItem('recentInventorySearches')!)).toEqual(search.recentSearches);
		act(() => search.removeRecentSearch('abc123'));
		expect(search.recentSearches).toEqual([]);
		expect(JSON.parse(localStorage.getItem('recentInventorySearches')!)).toEqual([]);
	});
	it('updates a recorded miss when refreshed inventory supplies a match', () => {
		render();
		act(() => search.selectRecentSearch('ZZZZZZ'));
		expect(search.recentSearches).toEqual([{ term: 'ZZZZZZ', wasMiss: true }]);
		render([{ model: 'ZZZZZZ' }]);
		expect(search.searchResults).toHaveLength(1);
		expect(search.recentSearches).toEqual([{ term: 'ZZZZZZ', wasMiss: false }]);
	});
	it('offers extended search after three distinct misses, without counting repeated misses', () => {
		render();
		for (const term of ['ZZZZZZ', 'YYYYYY', 'ZZZZZZ']) act(() => search.selectRecentSearch(term));
		expect(search.showExtendedToggle).toBe(false);
		act(() => search.selectRecentSearch('XXXXXX'));
		expect(search.showExtendedToggle).toBe(true);
	});
});
