import type { ColDef } from 'ag-grid-community';
import { HighlightCellRenderer } from './InventoryPage';

export const FIELD_NAMES = {
	EMCP: 'EMCP',
	MODEL: 'Model',
	MEMORY_SIZE: 'MemorySize',
};
export const AUTO_SIZED_COLUMNS = [FIELD_NAMES.MEMORY_SIZE];
// Declare here which fields should have a filter section.
export const FILTERABLE_FIELDS = [FIELD_NAMES.MEMORY_SIZE];

export const columnDefsBySheet: Record<string, ColDef[]> = {
	Sheet1: [
		// {
		// 	field: 'Brand',
		// 	headerName: 'Brand',
		// 	sortable: true,
		// 	filter: true,
		// 	filterParams: {
		// 		filterOptions: ['equals', 'greaterThan', 'lessThan'], // limit which comparisons show
		// 		buttons: ['apply', 'reset', 'cancel'], // add Apply/Reset/Cancel buttons at the bottom
		// 		closeOnApply: true,
		// 		defaultOption: 'greaterThan',
		// 	},
		// 	cellRenderer: HighlightCellRenderer,
		// },
		{
			field: FIELD_NAMES.EMCP,
			headerName: 'EMCP',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: FIELD_NAMES.MODEL,
			headerName: 'Model',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: FIELD_NAMES.MEMORY_SIZE,
			headerName: 'MemorySize',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
			comparator: ramComparator,
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
