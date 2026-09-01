import type { ColDef } from 'ag-grid-community';
import { HighlightCellRenderer } from './InventoryPage';

export const autosizedColumns = ['Ram', 'Brand'];
export const columnDefsBySheet: Record<string, ColDef[]> = {
	盖子板: [
		{
			field: 'Brand',
			headerName: 'Brand',
			sortable: true,
			filter: true,
			filterParams: {
				filterOptions: ['equals', 'greaterThan', 'lessThan'], // limit which comparisons show
				buttons: ['apply', 'reset', 'cancel'], // add Apply/Reset/Cancel buttons at the bottom
				closeOnApply: true,
				defaultOption: 'greaterThan',
			},
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: 'Model',
			headerName: 'Model',
			sortable: true,

			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: 'Ram',
			headerName: 'RAM',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
			comparator: ramComparator,
		},
	],
	Sheet3: [
		{
			field: 'EMCP',
			headerName: 'EMCP',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: 'model',
			headerName: 'model',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
	],
	内存表: [
		{
			field: 'EMMC_version',
			headerName: 'EMMC_version',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
		{
			field: 'Memory size',
			headerName: 'Memory size',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
			comparator: ramComparator,
		},
		{
			field: ' K3uh5h5',
			headerName: ' K3uh5h5',
			sortable: true,
			filter: true,
			cellRenderer: HighlightCellRenderer,
		},
	],
};

function ramToGb(value: string): number {
	const match = value.trim().match(/^([\d.]+)\s*([MGT])B?$/i);

	if (!match) {
		throw new Error(`Invalid RAM value: ${value}`);
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
