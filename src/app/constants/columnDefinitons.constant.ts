import type { ColDef } from 'ag-grid-community';
import { HighlightCellRenderer } from '../component/HighlightCellRenderer';

export const FIELD_NAMES = {
	BellekTipi: 'bellekTipi',
	MODEL: 'model',
	Depoloma: 'depolama',
	FIYAT: 'fiyat',
};
// Declare here which fields should have a filter section.
export const FILTERABLE_FIELDS = [FIELD_NAMES.Depoloma];

// Display name for a field, e.g. for a filter panel label - derived from
// columnDefsBySheet's headerName instead of duplicating those strings here.
export function getFieldLabel(field: string): string {
	return (
		columnDefsBySheet.find((colDef) => colDef.field === field)?.headerName ??
		field
	);
}

// Without an explicit `width`, AG Grid defaults every column to 200px and
// only treats `minWidth` as a floor for manual resizing - it does NOT shrink
// the initial render down to it. That meant these columns were actually
// rendering at 200px each (800px total) regardless of minWidth, which is why
// mobile needed the whole grid to scroll sideways instead of just the
// occasional overflowing cell. Setting `width` explicitly is what actually
// makes columns compact; `minWidth` stays as the floor for when a user
// manually drags a column narrower.
export const columnDefsBySheet: ColDef[] = [
	{
		field: FIELD_NAMES.MODEL,
		headerName: 'Model',
		sortable: true,
		cellRenderer: HighlightCellRenderer,
		width: 130,
		minWidth: 100,
	},
	{
		field: FIELD_NAMES.Depoloma,
		headerName: 'Depoloma',
		sortable: true,
		valueFormatter: depolamaValueFormatter,
		comparator: depolamaComparator,
		width: 95,
		minWidth: 90,
	},
	{
		field: FIELD_NAMES.BellekTipi,
		headerName: 'Bellek Türü',
		sortable: true,
		width: 95,
		minWidth: 90,
	},
	{
		field: FIELD_NAMES.FIYAT,
		headerName: 'Fiyat',
		sortable: true,
		valueFormatter: fiyatValueFormatter,
		width: 95,
		minWidth: 90,
		comparator: (valueA: string | null, valueB: string | null) => {
			const parse = (v: string | null): number => {
				if (v === null || v === undefined) return -Infinity; // nulls sort first; use Infinity to sort last
				const match = v.match(/[\d.]+/);
				return match ? parseFloat(match[0]) : -Infinity;
			};

			const a = parse(valueA);
			const b = parse(valueB);
			return a - b;
		},
	},
];

// DB-backed rows store depolama as a plain magnitude plus a separate
// depolamaBirimi unit ('GB'/'TB'); the bundled static dataset (the public
// page's fallback when there's no live item - see
// buildInventoryRecords.helper.ts) still has depolama as one un-split
// "128GB"-style string. Both shapes flow through this same column, so
// display/sort branch on which one a given row actually has.
function depolamaToGb(value: unknown, unit: unknown): number {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? NaN : unit === 'TB' ? value * 1024 : value;
	}
	try {
		return ramToGb(String(value ?? ''));
	} catch {
		return NaN;
	}
}

export function depolamaValueFormatter(params: any): string {
	const { value, data } = params;
	if (typeof value === 'number') {
		return data?.depolamaBirimi ? `${value} ${data.depolamaBirimi}` : String(value);
	}
	return value ?? '';
}

export function fiyatValueFormatter(params: any): string {
	const { value, data } = params;
	if (value === null || value === undefined || value === '') return '';
	return data?.paraBirimi ? `${value} ${data.paraBirimi}` : String(value);
}

export function depolamaComparator(
	valueA: unknown,
	valueB: unknown,
	nodeA: any,
	nodeB: any,
) {
	const a = depolamaToGb(valueA, nodeA?.data?.depolamaBirimi);
	const b = depolamaToGb(valueB, nodeB?.data?.depolamaBirimi);

	if (isNaN(a) && isNaN(b)) return 0;
	if (isNaN(a)) return 1;
	if (isNaN(b)) return -1;

	return a - b;
}

function ramToGb(value: string): number {
	const match = value.trim().match(/^([\d.]+)\s*([MGT])B?$/i);

	if (!match) {
		if (process.env.VITE_ENV !== 'production')
			throw new Error(`Invalid RAM value: ${value}`);
		return NaN;
	}

	const number = Number(match[1]);
	const unit = match[2].toUpperCase();

	return unit === 'G' ? number : unit === 'T' ? number * 1024 : number / 1000;
}

export function ramComparator(valueA: string, valueB: string) {
	let a: number, b: number;

	try {
		a = ramToGb(String(valueA ?? ''));
	} catch {
		a = NaN;
	}

	try {
		b = ramToGb(String(valueB ?? ''));
	} catch {
		b = NaN;
	}

	if (isNaN(a) && isNaN(b)) return 0;
	if (isNaN(a)) return 1;
	if (isNaN(b)) return -1;

	return a - b;
}
