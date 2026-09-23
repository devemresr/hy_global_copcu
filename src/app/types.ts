import * as XLSX from 'xlsx';
import type {
	Currency as SchemaCurrency,
	StorageUnit,
	EditableInventoryItemInput,
} from './schemas/item.schema';
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

// Currencies a Fiyat value can be priced in; only TRY is used today. Derived
// from schemas/item.schema.ts's currencySchema, the one place the valid
// currency codes are listed.
export type Currency = SchemaCurrency;

// One inventory item as it lives in the catalog/DB: every field sourced from
// inventoryData.ts, plus the fiyat/paraBirimi split. Keys are Turkish
// (camelCase) to match the DB's own field names.
export type InventoryItemRecord = {
	uretici?: string | null;
	ram?: string | null;
	eslesmeTuru?: string | null;
	bellekTipi?: string | null;
	sorgulananDeger?: string | null;
	model: string;
	depolama?: number | null;
	depolamaBirimi: StorageUnit;
	fiyat: number | null;
	paraBirimi: Currency;
};

// The fields an admin can change through ItemEditModal/FieldEditModal/
// BulkEditPanel, and what a valid value looks like for each - derived from
// schemas/item.schema.ts, the one place that field list is declared.
export type EditableInventoryItem = EditableInventoryItemInput;
export type EditableField = keyof EditableInventoryItem;

export type FieldChange = {
	field: EditableField;
	previousValue: string | number | null;
	newValue: string | number | null;
};
