// Pure XLSX workbook/sheet parsing, no browser APIs - shared by the upload
// path (parseFile.helper.ts, excelParser.worker.ts) and the server's import
// scripts. Kept apart from parseFile.helper.ts because that file uses
// FileReader/Worker, which the server's typecheck has no types for.
import * as XLSX from 'xlsx';
import type { ExcelRow } from '../../types';

export function parseWorkbookFromBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
	const data = new Uint8Array(buffer);
	return XLSX.read(data, { type: 'array', cellDates: true });
}

export function unmergeSheet(sheet: XLSX.WorkSheet): XLSX.WorkSheet {
	const merges = sheet['!merges'] || [];
	merges.forEach((merge) => {
		const topLeftAddr = XLSX.utils.encode_cell({
			r: merge.s.r,
			c: merge.s.c,
		});
		const topLeftCell = sheet[topLeftAddr];
		if (!topLeftCell) return;

		for (let r = merge.s.r; r <= merge.e.r; r++) {
			for (let c = merge.s.c; c <= merge.e.c; c++) {
				const addr = XLSX.utils.encode_cell({ r, c });
				if (addr === topLeftAddr) continue; // don't overwrite the source cell
				sheet[addr] = { ...topLeftCell };
			}
		}
	});

	// merges are now fully filled in as real cell values, so clear the merge metadata
	sheet['!merges'] = [];

	const sheetWithUnmergedValues = sheet;
	return sheetWithUnmergedValues;
}

// Unmerged first, so every row in a merged block carries the block's value.
export function parseSheetRows<T = ExcelRow>(
	wb: XLSX.WorkBook,
	sheetName: string,
): T[] {
	return XLSX.utils.sheet_to_json<T>(unmergeSheet(wb.Sheets[sheetName]));
}
