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
): () => void {
	const reader = new FileReader();
	let active = true;
	reader.onload = (e: ProgressEvent<FileReader>) => {
		if (!active) return;
		active = false;
		const result = e.target?.result as ArrayBuffer;
		onRead(result);
	};
	reader.onerror = () => {
		if (!active) return;
		active = false;
		onError('Failed to read file');
	};
	reader.readAsArrayBuffer(file);
	return () => {
		if (!active) return;
		active = false;
		reader.onload = null;
		reader.onerror = null;
		reader.abort();
	};
}

//  Inline path: read + parse on main thread
export function parseInline(
	file: File,
	onParsed: (wb: XLSX.WorkBook) => void,
	onError: OnErrorCallback,
): () => void {
	return readFileAsArrayBuffer(
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
	onParsed: (wb: XLSX.WorkBook) => void,
	onError: OnErrorCallback,
): () => void {
	let worker: Worker | null = null;
	let cancelled = false;
	const stopWorker = () => {
		if (!worker) return;
		worker.onmessage = null;
		worker.onerror = null;
		worker.terminate();
		worker = null;
	};
	const cancelRead = readFileAsArrayBuffer(
		file,
		(arrayBuffer) => {
			if (cancelled) return;
			worker = new Worker(
				new URL('./excelParser.worker.ts', import.meta.url),
				{ type: 'module' },
			);

			worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				if (cancelled) return;
				const response = event.data;
				stopWorker();
				if (response.status === 'success') {
					const wb: XLSX.WorkBook = {
						SheetNames: response?.sheetNames,
						Sheets: response?.sheets,
					} as XLSX.WorkBook;
					onParsed(wb);
				} else {
					onError(response?.message);
				}
			};

			worker.onerror = (err: ErrorEvent) => {
				if (cancelled) return;
				stopWorker();
				onError(err.message || 'Worker error');
			};

			worker.postMessage({ arrayBuffer }, [arrayBuffer]);
		},
		onError,
	);
	return () => { cancelled = true; cancelRead(); stopWorker(); };
}
