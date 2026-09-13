import type { ColDef } from 'ag-grid-community';
import { HighlightCellRenderer } from '../InventoryPage';

export const FIELD_NAMES = {
	BellekTipi: 'BellekTipi',
	MODEL: 'Model',
	Depoloma: 'Depoloma',
	FIYAT: 'Fiyat',
};
export const AUTO_SIZED_COLUMNS = [
	FIELD_NAMES.Depoloma,
	FIELD_NAMES.BellekTipi,
	FIELD_NAMES.FIYAT,
];
// Declare here which fields should have a filter section.
export const FILTERABLE_FIELDS = [FIELD_NAMES.Depoloma];

export const columnDefsBySheet: Record<string, ColDef[]> = {
	Sheet1: [
		// {
		// 	field: 'Brand',
		// 	headerName: 'Brand',
		// 	sortable: true,
		// 	filter: true,
		// 	filterParams: {
		// filterOptions: ['equals', 'greaterThan', 'lessThan'], // limit which comparisons show
		// 		buttons: ['apply', 'reset', 'cancel'], // add Apply/Reset/Cancel buttons at the bottom
		// 		closeOnApply: true,
		// 		defaultOption: 'greaterThan',
		// 	},
		// 	cellRenderer: HighlightCellRenderer,
		// },
		{
			field: FIELD_NAMES.MODEL,
			headerName: 'Model',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: FIELD_NAMES.Depoloma,
			headerName: 'Depoloma',
			sortable: true,
			filter: true,

			comparator: ramComparator,
		},
		{
			field: FIELD_NAMES.BellekTipi,
			headerName: 'Depoloma Türü',
			sortable: true,
			filter: true,
		},
		{
			field: FIELD_NAMES.FIYAT,
			headerName: 'Fiyat',
			sortable: true,
			filter: true,
		},
	],
};

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
