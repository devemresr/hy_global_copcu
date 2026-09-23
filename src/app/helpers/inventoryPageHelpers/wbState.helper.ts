import * as XLSX from 'xlsx';
import type { ExcelRow } from '../../types';

interface WorkbookState {
	workbook: XLSX.WorkBook | null;
	sheetNames: string[];
	selectedSheet: string;
	rows: ExcelRow[];
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
	  };

export const initialWorkbookState: WorkbookState = {
	workbook: null,
	sheetNames: [],
	selectedSheet: '',
	rows: [],
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

		default:
			return state;
	}
}
