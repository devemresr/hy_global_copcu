// Files larger than this get parsed in a Web Worker instead of the main thread.
import * as XLSX from 'xlsx';
import type { OnErrorCallback, WorkerResponse } from '../../types';
import { parseWorkbookFromBuffer } from './sheet.helper';

// Below this, worker spin-up + postMessage overhead isn't worth it.
export const WORKER_SIZE_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2MB

//  Shared file reading
export function readFileAsArrayBuffer(
	file: File,
	onRead: (buffer: ArrayBuffer) => void,
	onError: OnErrorCallback,
): void {
	const reader = new FileReader();
	reader.onload = (e: ProgressEvent<FileReader>) => {
		const result = e.target?.result as ArrayBuffer;
		onRead(result);
	};
	reader.onerror = () => onError('Failed to read file');
	reader.readAsArrayBuffer(file);
}

//  Inline path: read + parse on main thread
export function parseInline(
	file: File,
	onParsed: (wb: XLSX.WorkBook) => void,
	onError: OnErrorCallback,
): void {
	readFileAsArrayBuffer(
		file,
		(buffer) => {
			try {
				const wb = parseWorkbookFromBuffer(buffer);
				onParsed(wb);
			} catch (err) {
				onError(err instanceof Error ? err.message : 'Failed to parse file');
			}
		},
		onError,
	);
}

//  Worker path: read on main thread, parse off-thread
export function parseWithWorker(
	file: File,
	workerRef: React.RefObject<Worker | null>,
	onParsed: (wb: XLSX.WorkBook) => void,
	onError: OnErrorCallback,
): void {
	readFileAsArrayBuffer(
		file,
		(arrayBuffer) => {
			if (workerRef.current) {
				workerRef.current.terminate();
			}

			const worker = new Worker(
				new URL('./excelParser.worker.ts', import.meta.url),
				{ type: 'module' },
			);
			workerRef.current = worker;

			worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				const response = event.data;
				if (response.status === 'success') {
					const wb: XLSX.WorkBook = {
						SheetNames: response?.sheetNames,
						Sheets: response?.sheets,
					} as XLSX.WorkBook;
					onParsed(wb);
				} else {
					onError(response?.message);
				}
				worker.terminate();
				workerRef.current = null;
			};

			worker.onerror = (err: ErrorEvent) => {
				onError(err.message || 'Worker error');
				worker.terminate();
				workerRef.current = null;
			};

			worker.postMessage({ arrayBuffer }, [arrayBuffer]);
		},
		onError,
	);
}
