import { useMemo, useState } from 'react';
// import {  type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColDef } from 'ag-grid-community';
// import { useWorkbookLoader } from './hooks/Useworkbookloader';
import { useInventoryRows } from './hooks/useInventoryRows';
import { useAdminEditSettings } from './hooks/useAdminEditSettings';
import { diffEditableItem } from './helpers/adminPageHelpers/itemDiff.helper';
import type { ApiError } from './hooks/api/core/api-client';
import { ItemEditModal } from './component/admin/ItemEditModal';
import { FieldEditModal } from './component/admin/FieldEditModal';
import { ConfirmDialog } from './component/admin/ConfirmDialog';
import { AdminFieldCell } from './component/admin/AdminFieldCell';
import { BulkEditPanel } from './component/admin/BulkEditPanel';
import { LogEventsSection } from './component/admin/LogEventsSection';
import { InventoryBrowser } from './component/InventoryBrowser';
import {
	useGetItems,
	useCreateItem,
	useUpdateItem,
	useUpdateAnyItem,
	useDeleteAnyItem,
	useBulkUpdateItems,
} from './hooks/api/endpoints/useItems';
import type { ItemDto } from './hooks/api/endpoints/useItems';
import { isFieldNullable } from './constants/fieldRegistry.constant';
import { CURRENCY_OPTIONS } from './constants/currency.constant';
import { STORAGE_UNIT_OPTIONS } from './constants/storageUnit.constant';
import type { EditableField, EditableInventoryItem } from './types';

// A stable reference, so ItemEditModal's item-changed effect (which resets
// its form state) doesn't fire on every AdminPage re-render while the create
// modal is open and wipe out whatever the admin has typed so far.
const EMPTY_ITEM: EditableInventoryItem = {
	model: '',
	bellekTipi: null,
	depolama: null,
	depolamaBirimi: STORAGE_UNIT_OPTIONS[0].value,
	ram: null,
	fiyat: null,
	paraBirimi: CURRENCY_OPTIONS[0].value,
};

function toEditable(record: ItemDto): EditableInventoryItem {
	const {
		model,
		bellekTipi,
		depolama,
		depolamaBirimi,
		ram,
		fiyat,
		paraBirimi,
	} = record;
	return {
		model,
		bellekTipi,
		depolama: depolama ?? null,
		depolamaBirimi,
		ram,
		fiyat,
		paraBirimi,
	};
}

// Appended to the shared inventory columnDefs so the admin grid gets an
// edit/delete button pair per row that the public inventory grid has no use
// for.
function RowActionsCell({ data, onEdit, onDelete }: any) {
	return (
		<div className='flex h-full items-center gap-1'>
			<button
				type='button'
				onClick={() => onEdit(data._id)}
				className='rounded-xl bg-button-focus-bg px-2 py-1 text-xs font-medium hover:bg-button-hover-bg'
			>
				Düzenle
			</button>
			<button
				type='button'
				onClick={() => onDelete(data)}
				className='rounded-xl bg-button-focus-bg px-2 py-1 text-xs font-medium hover:bg-button-hover-bg'
			>
				Sil
			</button>
		</div>
	);
}

/**
 * Excel-upload wiring (pick a file, run it through the generic
 * workbook-parsing hook) sits alongside the real item list/edit flow, which
 * now reads and writes through /items instead of local-only state - editing
 * an item PATCHes the server and refetches the list on success. The upload
 * flow itself still doesn't persist anything (no bulk-create endpoint yet).
 */
function AdminPage() {
	// const [fileName, setFileName] = useState('');
	// const {
	// 	sheetNames,
	// 	selectedSheet,
	// 	rows: previewRows,
	// 	parseState,
	// 	handleFileChange,
	// } = useWorkbookLoader();

	const { data, status: _status } = useGetItems();
	const items = data?.items ?? [];

	const [editingId, setEditingId] = useState<string | null>(null);
	const [isCreatingItem, setIsCreatingItem] = useState(false);
	const queryClient = useQueryClient();

	const editingRecord = items.find((item) => item._id === editingId) ?? null;
	const editingItem = editingRecord ? toEditable(editingRecord) : null;

	// Re-created each render with whatever id is currently being edited - see
	// useUpdateItem's comment for why that's fine.
	const updateItemMutation = useUpdateItem(editingId ?? '');
	const createItemMutation = useCreateItem();

	// Per-cell edit/delete (see AdminFieldCell) can target any row in the grid
	// without first "opening" it the way the whole-row modal above does, so it
	// uses useUpdateAnyItem instead - see that hook's comment for why.
	const {
		confirmEdits,
		confirmDeletes,
		enterToConfirm,
		escapeToCancel,
		setConfirmEdits,
		setConfirmDeletes,
		setEnterToConfirm,
		setEscapeToCancel,
	} = useAdminEditSettings();
	const updateAnyItemMutation = useUpdateAnyItem();
	const deleteAnyItemMutation = useDeleteAnyItem();
	const bulkUpdateItemsMutation = useBulkUpdateItems();
	const [fieldEditTarget, setFieldEditTarget] = useState<{
		row: ItemDto;
		field: EditableField;
		label: string;
	} | null>(null);
	const [fieldDeleteTarget, setFieldDeleteTarget] = useState<{
		row: ItemDto;
		field: EditableField;
		label: string;
	} | null>(null);
	const [rowDeleteTarget, setRowDeleteTarget] = useState<ItemDto | null>(null);

	// The server records its own log entry for every PATCH/DELETE it handles
	// (see items.controller.ts's recordLogEvent calls), so a successful
	// mutation here just needs to invalidate 'logEvents' alongside 'items' -
	// no client-built log entry to construct or keep in sync with the server's.
	function invalidateAfterMutation() {
		queryClient.invalidateQueries({ queryKey: ['items'] });
		queryClient.invalidateQueries({ queryKey: ['logEvents'] });
	}

	// `fields` can carry more than one key - depolama/fiyat edits also carry
	// their paired depolamaBirimi/paraBirimi (see FieldEditModal), so a single
	// field+value pair isn't enough to describe every edit this handles.
	function commitFieldChange(
		row: ItemDto,
		fields: Partial<EditableInventoryItem>,
		label: string,
	) {
		updateAnyItemMutation.mutate(
			{ id: row._id, fields },
			{
				onSuccess: () => {
					invalidateAfterMutation();
					toast.success(`${label} güncellendi`);
				},
				onError: (error) => {
					toast.error('Güncelleme başarısız', { description: error.message });
				},
			},
		);
	}

	// One PATCH /items/bulk request setting `field` on every matched row's id,
	// instead of firing one PATCH per row - the server does it as a single
	// updateMany (see items.controller.ts's bulkUpdateItems).
	async function commitBulkFieldChange(
		matched: ItemDto[],
		field: EditableField,
		newValue: string | number | null,
	) {
		try {
			const result = await bulkUpdateItemsMutation.mutateAsync({
				ids: matched.map((row) => row._id),
				fields: { [field]: newValue } as Partial<EditableInventoryItem>,
			});
			invalidateAfterMutation();

			const missingCount = matched.length - result.matchedCount;
			if (missingCount > 0) {
				toast.warning(
					`${result.matchedCount} öğe güncellendi, ${missingCount} öğe artık mevcut değil`,
				);
			} else {
				toast.success(`${result.matchedCount} öğe güncellendi`);
			}
		} catch (error) {
			toast.error('Toplu güncelleme başarısız', {
				description: (error as ApiError).message,
			});
		}
	}

	function handleEditField(row: ItemDto, field: EditableField, label: string) {
		setFieldEditTarget({ row, field, label });
	}

	function handleDeleteField(
		row: ItemDto,
		field: EditableField,
		label: string,
	) {
		if (confirmDeletes) {
			setFieldDeleteTarget({ row, field, label });
		} else {
			commitFieldChange(row, { [field]: null }, label);
		}
	}

	// Removing the whole row is harder to reverse than clearing one field, so
	// this always confirms regardless of the confirmDeletes setting (which
	// only governs single-field clears).
	function commitDeleteRow(row: ItemDto) {
		deleteAnyItemMutation.mutate(row._id, {
			onSuccess: () => {
				invalidateAfterMutation();
				toast.success('Ürün silindi');
			},
			onError: (error) => {
				toast.error('Silme başarısız', { description: error.message });
			},
		});
	}

	// Same rows/columnDefs derivation the public inventory page uses, so the
	// admin grid gets identical model/depolama/bellekTipi/fiyat columns, search
	// and filters - plus a per-cell edit/delete button pair on every one of
	// those columns, and one more column, appended below, for the whole-row
	// edit/delete buttons.
	const { rows, colDef: baseColDef } = useInventoryRows(true, items);
	const colDef = useMemo<ColDef[]>(
		() => [
			...baseColDef.map((col) => ({
				...col,
				cellRenderer: AdminFieldCell,
				cellRendererParams: {
					displayRenderer: col.cellRenderer,
					onEdit: handleEditField,
					// A required field (e.g. model) has no valid "cleared" state, so
					// it gets no delete button at all instead of one that always
					// fails validation.
					onDelete: isFieldNullable(col.field as EditableField)
						? handleDeleteField
						: undefined,
					disabled: updateAnyItemMutation.isPending,
				},
			})),
			{
				colId: 'actions',
				headerName: '',
				sortable: false,
				filter: false,
				width: 140,
				minWidth: 130,
				cellRenderer: RowActionsCell,
				cellRendererParams: {
					onEdit: setEditingId,
					onDelete: setRowDeleteTarget,
				},
			},
		],
		// updateAnyItemMutation.isPending is a dependency on purpose - it's what
		// gives AdminFieldCell's buttons a new `disabled` value each time the
		// pending state flips, since AG Grid only re-reads cellRendererParams
		// when the columnDefs array itself gets a new reference.
		[baseColDef, confirmDeletes, updateAnyItemMutation.isPending],
	);

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
				invalidateAfterMutation();
				setEditingId(null);
				toast.success('Ürün güncellendi');
			},
			onError: (error) => {
				toast.error('Güncelleme başarısız', { description: error.message });
			},
		});
	}

	function handleCreateItem(newItem: EditableInventoryItem) {
		createItemMutation.mutate(newItem, {
			onSuccess: () => {
				invalidateAfterMutation();
				setIsCreatingItem(false);
				toast.success('Ürün eklendi');
			},
			onError: (error) => {
				toast.error('Ekleme başarısız', { description: error.message });
			},
		});
	}

	// function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
	// 	const file = e.target.files?.[0];
	// 	if (!file) return;
	// 	setFileName(file.name);
	// 	handleFileChange(file);
	// }

	return (
		<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-text'>
			{/* <h1 className='text-xl font-semibold mb-4'>Admin: Excel Import</h1>
			<input type='file' accept='.xlsx,.xls' onChange={onFileInputChange} />
			<div className='mt-4 text-sm flex flex-col gap-1'>
				<p>Status: {parseState.status}</p>
				{parseState.errorMsg && (
					<p className='text-red-500'>{parseState.errorMsg}</p>
				)}
				{fileName && <p>File: {fileName}</p>}
				{sheetNames.length > 0 && <p>Sheets: {sheetNames.join(', ')}</p>}
				{selectedSheet && <p>Selected sheet: {selectedSheet}</p>}
				<p>Parsed rows: {previewRows.length}</p>
			</div>

			<h2 className='text-lg font-semibold mt-8 mb-2'>Ürünler</h2>
			{status === 'pending' && (
				<p className='text-sm opacity-70'>Yükleniyor...</p>
			)}
			{status === 'error' && (
				<p className='text-sm text-red-500'>Ürünler yüklenemedi</p>
			)} */}

			<button
				type='button'
				onClick={() => setIsCreatingItem(true)}
				className='mb-3 rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
			>
				+ Yeni Ürün Ekle
			</button>

			<BulkEditPanel
				items={items}
				requireApproval={confirmEdits}
				enterEnabled={enterToConfirm}
				escapeEnabled={escapeToCancel}
				onApply={commitBulkFieldChange}
			/>

			<div className='mb-3 flex flex-col gap-1 rounded-xl bg-button-bg p-3 text-sm'>
				<span className='font-medium'>Alan düzenleme ayarları</span>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={confirmEdits}
						onChange={(e) => setConfirmEdits(e.target.checked)}
					/>
					Alan düzenlemelerinde onay iste
				</label>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={confirmDeletes}
						onChange={(e) => setConfirmDeletes(e.target.checked)}
					/>
					Alan silmelerinde onay iste
				</label>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={enterToConfirm}
						onChange={(e) => setEnterToConfirm(e.target.checked)}
					/>
					Enter tuşuyla onayla
				</label>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={escapeToCancel}
						onChange={(e) => setEscapeToCancel(e.target.checked)}
					/>
					Escape tuşuyla kapat
				</label>
			</div>

			<InventoryBrowser rows={rows} colDef={colDef} />

			{editingItem && (
				<ItemEditModal
					item={editingItem}
					onClose={() => setEditingId(null)}
					onSave={handleSaveItem}
					isSaving={updateItemMutation.isPending}
					enterEnabled={enterToConfirm}
					escapeEnabled={escapeToCancel}
				/>
			)}

			{isCreatingItem && (
				<ItemEditModal
					mode='create'
					item={EMPTY_ITEM}
					onClose={() => setIsCreatingItem(false)}
					onSave={handleCreateItem}
					isSaving={createItemMutation.isPending}
					enterEnabled={enterToConfirm}
					escapeEnabled={escapeToCancel}
				/>
			)}

			{fieldEditTarget && (
				<FieldEditModal
					row={fieldEditTarget.row}
					field={fieldEditTarget.field}
					label={fieldEditTarget.label}
					requireApproval={confirmEdits}
					enterEnabled={enterToConfirm}
					escapeEnabled={escapeToCancel}
					onClose={() => setFieldEditTarget(null)}
					onConfirm={(changes) => {
						commitFieldChange(
							fieldEditTarget.row,
							changes,
							fieldEditTarget.label,
						);
						setFieldEditTarget(null);
					}}
				/>
			)}

			{fieldDeleteTarget && (
				<ConfirmDialog
					title='Alanı sil'
					message={
						<>
							<b>{fieldDeleteTarget.label}</b> alanı{' '}
							<b>{fieldDeleteTarget.row.model}</b> için temizlenecek.
						</>
					}
					onConfirm={() => {
						commitFieldChange(
							fieldDeleteTarget.row,
							{ [fieldDeleteTarget.field]: null },
							fieldDeleteTarget.label,
						);
						setFieldDeleteTarget(null);
					}}
					onCancel={() => setFieldDeleteTarget(null)}
					enterEnabled={enterToConfirm}
					escapeEnabled={escapeToCancel}
				/>
			)}

			{rowDeleteTarget && (
				<ConfirmDialog
					title='Ürünü sil'
					message={
						<>
							<b>{rowDeleteTarget.model}</b> kalıcı olarak silinecek.
						</>
					}
					onConfirm={() => {
						commitDeleteRow(rowDeleteTarget);
						setRowDeleteTarget(null);
					}}
					onCancel={() => setRowDeleteTarget(null)}
					enterEnabled={enterToConfirm}
					escapeEnabled={escapeToCancel}
				/>
			)}

			<LogEventsSection />
		</div>
	);
}

export default AdminPage;
