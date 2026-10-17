import type { WorkerResponse } from '../../types';
import { parseWorkbookFromBuffer } from './sheet.helper';

self.onmessage = (event: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
	try {
		const wb = parseWorkbookFromBuffer(event.data.arrayBuffer);
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
