import * as XLSX from 'xlsx';
import type { WorkerResponse } from './types';

self.onmessage = (event: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
	try {
		const data = new Uint8Array(event.data.arrayBuffer);
		const wb = XLSX.read(data, { type: 'array', cellDates: true });
		const response: WorkerResponse = {
			status: 'success',
			sheetNames: wb.SheetNames,
			sheets: wb.Sheets,
		};
		self.postMessage(response);
	} catch (err) {
		const response: WorkerResponse = {
			status: 'error',
			message: err instanceof Error ? err.message : 'Failed to parse file',
		};
		self.postMessage(response);
	}
};
