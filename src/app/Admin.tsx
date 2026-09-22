import { useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkbookLoader } from './hooks/Useworkbookloader';
import { diffEditableItem } from './helpers/adminPageHelpers/itemDiff.helper';
import { ItemEditModal } from './component/admin/ItemEditModal';
import { useGetItems, useUpdateItem } from './hooks/api/endpoints/useItems';
import type { ItemDto } from './hooks/api/endpoints/useItems';
import type { EditableInventoryItem, LogEvent } from './types';

function toEditable(record: ItemDto): EditableInventoryItem {
	const { Model, BellekTipi, Depoloma, ram, Fiyat, Currency } = record;
	return { Model, BellekTipi, Depoloma, ram, Fiyat, Currency };
}

/**
 * Excel-upload wiring (pick a file, run it through the generic
 * workbook-parsing hook) sits alongside the real item list/edit flow, which
 * now reads and writes through /items instead of local-only state - editing
 * an item PATCHes the server and refetches the list on success. The upload
 * flow itself still doesn't persist anything (no bulk-create endpoint yet).
 */
function AdminPage() {
	const [fileName, setFileName] = useState('');
	const { sheetNames, selectedSheet, rows, parseState, handleFileChange } =
		useWorkbookLoader();

	const { data, status } = useGetItems();
	const items = data?.items ?? [];

	const [log, setLog] = useState<LogEvent[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const editingRecord = items.find((item) => item._id === editingId) ?? null;
	const editingItem = editingRecord ? toEditable(editingRecord) : null;

	// Re-created each render with whatever id is currently being edited - see
	// useUpdateItem's comment for why that's fine.
	const updateItemMutation = useUpdateItem(editingId ?? '');

	function handleSaveItem(updated: EditableInventoryItem) {
		if (!editingRecord) return;
		const previous = toEditable(editingRecord);
		const fields = diffEditableItem(previous, updated);
		if (fields.length === 0) {
			setEditingId(null);
			return;
		}

		updateItemMutation.mutate(updated, {
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ['items'] });
				setLog((prev) => [
					{
						id: crypto.randomUUID(),
						timestamp: new Date().toISOString(),
						adminUsername: 'admin', // todo placeholder until auth wires the real user in
						action: 'item_update',
						items: [{ itemKey: previous.Model, fields }],
					},
					...prev,
				]);
				setEditingId(null);
			},
		});
	}

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

			<h2 className='text-lg font-semibold mt-8 mb-2'>Ürünler</h2>
			{status === 'pending' && <p className='text-sm opacity-70'>Yükleniyor...</p>}
			{status === 'error' && (
				<p className='text-sm text-red-500'>Ürünler yüklenemedi</p>
			)}
			<div className='flex flex-col gap-1 max-h-[50vh] overflow-y-auto'>
				{items.map((item) => (
					<div
						key={item._id}
						className='flex items-center justify-between rounded-xl bg-button-bg px-3 py-2 text-sm'
					>
						<span>
							{item.Model} — {item.Fiyat ?? '—'} {item.Currency}
						</span>
						<button
							type='button'
							onClick={() => setEditingId(item._id)}
							className='rounded-xl bg-button-focus-bg px-2 py-1 text-xs font-medium hover:bg-button-hover-bg'
						>
							Düzenle
						</button>
					</div>
				))}
			</div>

			{editingItem && (
				<ItemEditModal
					item={editingItem}
					onClose={() => setEditingId(null)}
					onSave={handleSaveItem}
				/>
			)}

			{log.length > 0 && (
				<>
					<h2 className='text-lg font-semibold mt-8 mb-2'>
						Değişiklik Geçmişi
					</h2>
					<div className='flex flex-col gap-2 text-sm'>
						{log.map((event) => (
							<div key={event.id} className='rounded-xl bg-button-bg px-3 py-2'>
								{event.items.map((itemChange) => (
									<div key={itemChange.itemKey}>
										<p>
											{new Date(event.timestamp).toLocaleString('tr-TR')} —{' '}
											{event.adminUsername} — {itemChange.itemKey}
										</p>
										{itemChange.fields.map((f) => (
											<p key={f.field} className='pl-4 opacity-80'>
												{f.field}: {f.previousValue ?? '—'} →{' '}
												{f.newValue ?? '—'}
											</p>
										))}
									</div>
								))}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export default AdminPage;
