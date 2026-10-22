import { act, createElement, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { useWorkbookLoader } from '../app/hooks/Useworkbookloader';
import { WORKER_SIZE_THRESHOLD_BYTES } from '../app/helpers/inventoryPageHelpers/parseFile.helper';
import type { WorkerResponse } from '../app/types';

const readers: FakeReader[] = [];
const workers: FakeWorker[] = [];
class FakeReader {
	onload: ((event: { target: { result: ArrayBuffer } }) => void) | null = null;
	onerror: (() => void) | null = null;
	abort = vi.fn();
	constructor() { readers.push(this); }
	readAsArrayBuffer = vi.fn();
	finish(buffer = new ArrayBuffer(1)) { this.onload?.({ target: { result: buffer } }); }
}
class FakeWorker {
	onmessage: ((event: { data: WorkerResponse }) => void) | null = null;
	onerror: ((event: { message: string }) => void) | null = null;
	terminate = vi.fn(); postMessage = vi.fn();
	constructor() { workers.push(this); }
	succeed(model: string) {
		this.onmessage?.({ data: { status: 'success', sheetNames: ['Inventory'], sheets: { Inventory: XLSX.utils.json_to_sheet([{ Model: model, Depoloma: '64 GB' }]) } } });
	}
}
let root: Root;
let container: HTMLDivElement;
let loader: ReturnType<typeof useWorkbookLoader>;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function Harness() {
	const result = useWorkbookLoader();
	useEffect(() => { loader = result; }, [result]);
	return null;
}
function upload(large = true) { act(() => loader.handleFileChange(new File([new Uint8Array(large ? WORKER_SIZE_THRESHOLD_BYTES + 1 : 1)], 'inventory.xlsx'))); }
function unmount() { act(() => root.unmount()); root = createRoot(container); }
beforeEach(() => {
	readers.length = 0; workers.length = 0;
	vi.stubGlobal('FileReader', FakeReader); vi.stubGlobal('Worker', FakeWorker);
	container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
	act(() => root.render(createElement(StrictMode, null, createElement(Harness))));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe('workbook loading lifecycle', () => {
	it('keeps the worker alive across parsing state updates and accepts its result', () => {
		upload(); act(() => readers[0].finish());
		expect(workers[0].terminate).not.toHaveBeenCalled();
		expect(loader.parseState).toMatchObject({ status: 'parsing', parseMethod: 'worker' });
		act(() => workers[0].succeed('FIRST'));
		expect(loader.rows).toEqual([expect.objectContaining({ Model: 'FIRST' })]);
		expect(loader.parseState.status).toBe('idle');
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('terminates the worker that was created after mount when unmounting', () => {
		upload(); act(() => readers[0].finish()); unmount();
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('does not start a worker after unmount while the file is still being read', () => {
		upload(); unmount(); act(() => readers[0].finish());
		expect(workers).toHaveLength(0);
	});
	it('keeps the latest upload when file reads finish out of order', () => {
		upload(); upload();
		act(() => readers[1].finish()); act(() => workers[0].succeed('LATEST'));
		act(() => readers[0].finish());
		expect(workers).toHaveLength(1);
		expect(loader.rows).toEqual([expect.objectContaining({ Model: 'LATEST' })]);
	});
	it('stops an older worker when switching to an inline upload', () => {
		upload(); act(() => readers[0].finish()); upload(false);
		expect(workers[0].terminate).toHaveBeenCalledOnce();
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Model: 'INLINE', Depoloma: '64 GB' }]), 'Inventory');
		act(() => readers[1].finish(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })));
		act(() => workers[0].succeed('STALE'));
		expect(loader.rows).toEqual([expect.objectContaining({ Model: 'INLINE' })]);
		expect(loader.parseState.parseMethod).toBe('inline');
	});
});
