import type { ColumnFilterState } from 'ag-grid-community';
import * as XLSX from 'xlsx';
import type { ExcelRow } from '../../types';

interface WorkbookState {
	workbook: XLSX.WorkBook | null;
	sheetNames: string[];
	selectedSheet: string;
	rows: ExcelRow[];
	// per-sheet, per-field selected values
	columnFiltersBySheet: Record<string, ColumnFilterState>;
}

export type WorkbookAction =
	| { type: 'WORKBOOK_LOADED'; workbook: XLSX.WorkBook; sheetNames: string[] }
	| {
			type: 'SHEET_SELECTED';
			sheetName: string;
	  }
	| {
			type: 'ROWS_PARSED';
			rows: ExcelRow[];
	  }
	| {
			type: 'FILTER_INITIALIZED';
			sheetName: string;
			field: string;
			values: Set<string>;
	  }
	| {
			type: 'FILTER_CHANGED';
			sheetName: string;
			field: string;
			values: Set<string>;
	  };

export const initialWorkbookState: WorkbookState = {
	workbook: null,
	sheetNames: [],
	selectedSheet: '',
	rows: [],
	columnFiltersBySheet: {},
};

export function workbookReducer(
	state: WorkbookState,
	action: WorkbookAction,
): WorkbookState {
	switch (action.type) {
		case 'WORKBOOK_LOADED':
			return {
				...state,
				workbook: action.workbook,
				sheetNames: action.sheetNames,
			};
		case 'SHEET_SELECTED':
			return {
				...state,
				selectedSheet: action.sheetName,
			};
		case 'ROWS_PARSED':
			return {
				...state,
				rows: action.rows,
			};
		case 'FILTER_INITIALIZED': {
			const existing =
				state.columnFiltersBySheet[action.sheetName]?.[action.field];
			if (existing) return state; // don't clobber a user's existing selection
			return {
				...state,
				columnFiltersBySheet: {
					...state.columnFiltersBySheet,
					[action.sheetName]: {
						...state.columnFiltersBySheet[action.sheetName],
						[action.field]: action.values,
					},
				},
			};
		}

		case 'FILTER_CHANGED':
			return {
				...state,
				columnFiltersBySheet: {
					...state.columnFiltersBySheet,
					[action.sheetName]: {
						...state.columnFiltersBySheet[action.sheetName],
						[action.field]: action.values,
					},
				},
			};

		default:
			return state;
	}
}
