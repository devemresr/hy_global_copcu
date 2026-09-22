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

// Currencies a Fiyat value can be priced in; only TRY is used today.
export type Currency = 'TRY' | 'USD';

// One inventory item as it lives in the catalog/DB: every field sourced from
// inventoryData.ts, plus the Fiyat/Currency split.
export type InventoryItemRecord = {
	manufacturer?: string | null;
	ram?: string | null;
	match_type?: string | null;
	BellekTipi?: string | null;
	queried_as?: string | null;
	Model: string;
	Depoloma?: string | null;
	Fiyat: number | null;
	Currency: Currency;
};

export type EditableField =
	| 'Model'
	| 'BellekTipi'
	| 'Depoloma'
	| 'ram'
	| 'Fiyat'
	| 'Currency';

// The subset of InventoryItemRecord an admin can change through ItemEditModal.
export type EditableInventoryItem = Pick<InventoryItemRecord, EditableField>;

export type FieldChange = {
	field: EditableField;
	previousValue: string | number | null;
	newValue: string | number | null;
};

// One item's field changes; a bulk action carries several of these under one LogEvent.
export type ItemChange = {
	itemKey: string; // Model at the time of the edit
	fields: FieldChange[];
};

export type LogEvent = {
	id: string;
	timestamp: string; // ISO 8601
	adminUsername: string;
	action: 'item_update';
	items: ItemChange[];
};
