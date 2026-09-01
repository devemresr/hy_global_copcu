import * as XLSX from 'xlsx';
// A single parsed row from the Excel sheet. Keys are the exact column headers
// (e.g. "Description", "Code", "Created Date"). Values can be strings, numbers,
// dates (when cellDates: true resolves a real date), or booleans/blank cells.
export type CellValue = string | number | boolean | Date | null | undefined;

export interface ExcelRow {
	[column: string]: CellValue;
}

export type ParseStatus = 'idle' | 'parsing' | 'error';
export type ParseMethod = 'inline' | 'worker' | null;

// Messages sent TO the worker
export interface WorkerRequest {
	arrayBuffer: ArrayBuffer;
}

// Messages received FROM the worker
export type WorkerResponse =
	| {
			status: 'success';
			sheetNames: string[];
			sheets: Record<string, XLSX.WorkSheet>;
	  }
	| { status: 'error'; message: string };

export type OnParsedCallback = (rows: ExcelRow[]) => void;
export type OnErrorCallback = (message: string) => void;
