import { useSyncExternalStore } from 'react';
export const STOCK_PALETTES = [
	{
		id: 'cobalt',
		label: 'Kobalt ve turuncu',
		description: 'Canlı mavi ve turuncu, nötr yüzeyler.',
	},
	{
		id: 'forest',
		label: 'Orman ve mercan',
		description: 'Derin yeşil, sıcak mercan ve altın vurgu.',
	},
	{
		id: 'ink',
		label: 'Taş ve mürekkep',
		description: 'Dumanlı tonlar, kobalt vurgu.',
	},
	{
		id: 'earth',
		label: 'Toprak',
		description: 'Zeytin ve taş, canlı kiremit vurgu.',
	},
	{
		id: 'bronze',
		label: 'Bronz',
		description: 'Petrol ve bronz, bakır vurgu.',
	},
	{
		id: 'tol',
		label: 'Tol · soluk',
		description: 'Paul Tol’un muted renklerinden.',
	},
] as const;
export type StockPalette = (typeof STOCK_PALETTES)[number]['id'];
const KEY = 'admin.stock.palette.v1';
const EVENT = 'stock-palette-change';
function valid(value: unknown): value is StockPalette {
	return STOCK_PALETTES.some((palette) => palette.id === value);
}
function stored(): StockPalette {
	try {
		const value = localStorage.getItem(KEY);
		if (valid(value)) return value;
	} catch {
		/* Keep the default when storage is blocked. */
	}
	return 'ink';
}
export function initializeStockPalette() {
	document.documentElement.dataset.stockPalette = stored();
}
function snapshot(): StockPalette {
	const value = document.documentElement.dataset.stockPalette;
	return valid(value) ? value : stored();
}
function subscribe(listener: () => void) {
	function storage(event: StorageEvent) {
		if (event.key === KEY || event.key === null) {
			initializeStockPalette();
			listener();
		}
	}
	window.addEventListener(EVENT, listener);
	window.addEventListener('storage', storage);
	return () => {
		window.removeEventListener(EVENT, listener);
		window.removeEventListener('storage', storage);
	};
}
function change(palette: StockPalette) {
	document.documentElement.dataset.stockPalette = palette;
	let saved = true;
	try {
		localStorage.setItem(KEY, palette);
	} catch {
		saved = false;
	}
	window.dispatchEvent(new Event(EVENT));
	return saved;
}
export function useStockPalette() {
	return {
		palette: useSyncExternalStore(
			subscribe,
			snapshot,
			() => 'ink' as StockPalette,
		),
		setPalette: change,
	};
}
