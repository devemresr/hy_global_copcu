import type { ColDef } from 'ag-grid-community';
import { HighlightCellRenderer } from '../InventoryPage';

export const FIELD_NAMES = {
	BellekTipi: 'BellekTipi',
	MODEL: 'Model',
	Depoloma: 'Depoloma',
	FIYAT: 'Fiyat',
};
// Declare here which fields should have a filter section.
export const FILTERABLE_FIELDS = [FIELD_NAMES.Depoloma];

// Raw BellekTipi values treated as junk/test data: excluded from the grid
// and the filter dropdown entirely (case-insensitive), regardless of the
// current filter selection. Add more as bad values turn up in the data.
export const BELLEK_TIPI_EXCLUDED_VALUES = [
	'BGA153',
	'NAND',
	'NVME',
	'SSD',
	'UMCP',
];

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
		comparator: ramComparator,
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
