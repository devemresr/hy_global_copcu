import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FilterWorkspace } from '../app/component/admin/FilterWorkspace';
import { BOOKMARKS_KEY, parseSharedFilter, readFilterBookmarks, serializeFilter, type SavedCondition } from '../app/helpers/adminPageHelpers/savedFilters.helper';

const conditions: SavedCondition[] = [
	{ field: 'bellekTipi', op: 'in', value: 'UFS, EMMC' },
	{ field: 'depolama', op: 'gte', value: '64' },
	{ field: 'fiyat', op: 'notExists', value: '' },
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const originalWidth = window.innerWidth;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperties(HTMLDialogElement.prototype, {
	showModal: { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
	close: { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } },
});
afterEach(() => {
	if (root) act(() => root?.unmount());
	root = undefined;
	container?.remove();
	localStorage.removeItem(BOOKMARKS_KEY);
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});

function renderWorkspace(width: number) {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	const onLoad = vi.fn();
	act(() => root!.render(createElement(FilterWorkspace, { conditions, onLoad, children: 'Editor' })));
	return onLoad;
}
function clickButton(text: string) {
	act(() => [...container!.querySelectorAll('button')].find((button) => button.textContent === text)!.click());
}
function enterText(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
	act(() => {
		const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
}
describe('filter sharing and bookmarks', () => {
	it('round trips conditions without changing operators or values', () => {
		expect(parseSharedFilter(serializeFilter(conditions))).toEqual(conditions);
	});
	it('rejects invalid pasted text and unsupported field/operator combinations', () => {
		expect(() => parseSharedFilter('not a filter')).toThrow();
		expect(() => parseSharedFilter(JSON.stringify({ version: 1, conditions: [{ field: 'model', op: 'gte', value: '64' }] }))).toThrow();
		expect(() => parseSharedFilter(JSON.stringify({ version: 1, conditions: [{ field: '_id', op: 'equals', value: 'abc' }] }))).toThrow();
		expect(() => serializeFilter([])).toThrow();
	});
	it('restores valid saved filters and tolerates damaged browser storage', () => {
		const saved = [{ id: 'bookmark-1', name: 'Large chips', conditions }];
		localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(saved));
		expect(readFilterBookmarks()).toEqual(saved);
		localStorage.setItem(BOOKMARKS_KEY, 'broken');
		expect(readFilterBookmarks()).toEqual([]);
	});
});

describe('filter workspace', () => {
	it('opens a desktop side panel, saves a filter and loads it without applying an edit', () => {
		const onLoad = renderWorkspace(1280);
		clickButton('Filtre yer imleri');
		expect(container!.querySelector('aside')).not.toBeNull();
		expect(container!.querySelector('dialog')).toBeNull();
		enterText(container!.querySelector('input')!, 'Large chips');
		clickButton('Geçerli filtreyi kaydet');
		expect(readFilterBookmarks()[0].conditions).toEqual(conditions);
		expect(onLoad).not.toHaveBeenCalled();
		clickButton('Large chips');
		expect(onLoad).toHaveBeenCalledWith(conditions);
		expect(container!.querySelector('aside')).toBeNull();
	});
	it('opens bookmarks in a modal on mobile', () => {
		renderWorkspace(390);
		clickButton('Filtre yer imleri');
		expect(container!.querySelector('dialog[open]')?.getAttribute('aria-label')).toBe('Filtre yer imleri');
		expect(container!.querySelector('aside')).toBeNull();
		act(() => container!.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })));
		expect(container!.querySelector('dialog')).toBeNull();
	});
	it('validates pasted filters before loading them', () => {
		const onLoad = renderWorkspace(1280);
		clickButton('Filtre yapıştır');
		enterText(container!.querySelector('textarea')!, 'invalid');
		clickButton('Filtreyi yükle');
		expect(onLoad).not.toHaveBeenCalled();
		expect(container!.querySelector('[role="alert"]')).not.toBeNull();
		enterText(container!.querySelector('textarea')!, serializeFilter(conditions));
		clickButton('Filtreyi yükle');
		expect(onLoad).toHaveBeenCalledWith(conditions);
		expect(container!.querySelector('dialog')).toBeNull();
	});
});
