import { useState, type ChangeEvent } from 'react';
import { useWorkbookLoader } from './hooks/Useworkbookloader';

/**
 * Minimal Excel-upload wiring: pick a file, run it through the generic
 * workbook-parsing hook, and show what came out. No grid/UI polish yet —
 * this page exists to prove the extracted parsing pipeline works end to end;
 * the real admin UI gets built on top of this later.
 */
function AdminPage() {
	const [fileName, setFileName] = useState('');
	const { sheetNames, selectedSheet, rows, parseState, handleFileChange } =
		useWorkbookLoader();

	function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setFileName(file.name);
		handleFileChange(file);
	}

	return (
		<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-text'>
			<h1 className='text-xl font-semibold mb-4'>Admin: Excel Import</h1>
			<input type='file' accept='.xlsx,.xls' onChange={onFileInputChange} />
			<div className='mt-4 text-sm flex flex-col gap-1'>
				<p>Status: {parseState.status}</p>
				{parseState.errorMsg && (
					<p className='text-red-500'>{parseState.errorMsg}</p>
				)}
				{fileName && <p>File: {fileName}</p>}
				{sheetNames.length > 0 && <p>Sheets: {sheetNames.join(', ')}</p>}
				{selectedSheet && <p>Selected sheet: {selectedSheet}</p>}
				<p>Parsed rows: {rows.length}</p>
			</div>
		</div>
	);
}

export default AdminPage;
