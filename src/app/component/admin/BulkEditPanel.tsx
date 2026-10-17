import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import type { EditableInventoryItem } from '../../types';
import type { ItemDto } from '../../hooks/api/endpoints/useItems';
import {
	FIELD_REGISTRY,
	PAIRED_ENUM_FIELD,
	fieldLabel,
	type FieldKey,
} from '../../constants/fieldRegistry.constant';
import {
	filterRowsByFields,
	type FieldFilter,
} from '../../helpers/inventoryPageHelpers/fieldFilter.helper';
import { ConfirmDialog } from './ConfirmDialog';
import { DisplayValue } from './DisplayValue';
import { Pagination } from './Pagination';
import { BulkActionEditor } from './BulkActionEditor';
import { buildBulkFields, type BulkAction } from '../../helpers/adminPageHelpers/bulkEdit.helper';
import { FilterWorkspace } from './FilterWorkspace';
import { conditionsToFilters, newFilterCondition as newCondition, type FilterCondition as Condition } from '../../helpers/adminPageHelpers/filterConditions.helper';
import { FilterConditionEditor } from './FilterConditionEditor';

const PREVIEW_FIELDS = new Set(['model', 'bellekTipi', 'depolama', 'fiyat', 'paraBirimi']);

// Only conditions with everything they need to actually filter make it into
// the real FieldFilter list - a half-filled row (op picked, value still
// blank) is just in-progress typing, not "match nothing".
function toFieldFilters(conditions: Condition[]): FieldFilter[] {
	return conditionsToFilters(conditions.filter(
			(c) => c.op === 'exists' || c.op === 'notExists' || c.value.trim() !== '',
		));
}

// "Hazır değişiklikler": one click fills the conditions for a bellekTipi +
// storage size combination and points the action at fiyat, so the admin only
// has to type the new price - the apply/confirm flow stays the regular one.
const PRESET_MEMORY_TYPES = ['eMMC', 'eMCP', 'all'] as const;
type PresetMemoryType = (typeof PRESET_MEMORY_TYPES)[number];

const PRESET_SIZES = [
	{ label: '8GB', depolama: 8, birim: 'GB' },
	{ label: '16GB', depolama: 16, birim: 'GB' },
	{ label: '32GB', depolama: 32, birim: 'GB' },
	{ label: '64GB', depolama: 64, birim: 'GB' },
	{ label: '128GB', depolama: 128, birim: 'GB' },
	{ label: '256GB', depolama: 256, birim: 'GB' },
	{ label: '512GB', depolama: 512, birim: 'GB' },
	{ label: '1TB', depolama: 1, birim: 'TB' },
] as const;
type PresetSize = (typeof PRESET_SIZES)[number];

function presetConditions(
	memoryType: PresetMemoryType,
	size: PresetSize,
): Condition[] {
	return [
		...(memoryType === 'all' ? [] : [{ ...newCondition(), field: 'bellekTipi' as const, value: memoryType }]),
		{ ...newCondition(), field: 'depolama', value: String(size.depolama) },
		{ ...newCondition(), field: 'depolamaBirimi', value: size.birim },
	];
}

// Derived from the conditions themselves, so a manual edit un-highlights the
// preset button instead of leaving it looking applied.
function isPresetActive(
	conditions: Condition[],
	memoryType: PresetMemoryType,
	size: PresetSize,
): boolean {
	const expected = presetConditions(memoryType, size);
	return (
		conditions.length === expected.length &&
		expected.every((e, i) => {
			const c = conditions[i];
			return (
				c.field === e.field &&
				c.op === 'equals' &&
				c.value.trim().toLowerCase() === e.value.toLowerCase()
			);
		})
	);
}

const HINT_STORAGE_KEY = 'bulkEditHintVisible';

// Per-browser, same convention as useAdminEditSettings: shown by default for
// an admin who's never touched this key, so a first-timer sees the hint -
// once they dismiss it, it stays dismissed instead of resurfacing on every
// reload once they already know how the panel works.
function loadHintVisible(): boolean {
	try {
		const raw = localStorage.getItem(HINT_STORAGE_KEY);
		return raw === null ? true : raw === 'true';
	} catch {
		return true;
	}
}

type BulkEditPanelProps = {
	onDelete?: (matched: ItemDto[]) => void | Promise<void>;
	items: ItemDto[];
	requireApproval: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	onApply: (
		matched: ItemDto[],
		fields: Partial<EditableInventoryItem>,
	) => void | Promise<void>;
};

// Rule-based bulk edit: build up filter conditions (field + operator + value,
// same shape as FieldFilter/FieldFilterOp) to select a set of items, then
// apply several field changes to all of them at once - e.g. every item with
// bellekTipi "EMMC" changed to "UFS" in one step instead of one row at a time.
export function BulkEditPanel({
	items,
	requireApproval,
	enterEnabled,
	escapeEnabled,
	onApply,
	onDelete,
}: BulkEditPanelProps) {
	// Closed by default - a bulk action touches many rows at once and shouldn't
	// carry the same visual weight as a single field/row edit.
	const [isOpen, setIsOpen] = useState(false);
	const [hintVisible, setHintVisible] = useState(loadHintVisible);
	const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
	const [actions, setActions] = useState<BulkAction[]>([{ field: 'bellekTipi', value: '' }]);
	const [pendingBulk, setPendingBulk] = useState<{ matched: ItemDto[]; fields: Partial<EditableInventoryItem> } | null>(null);
	const [isApplying, setIsApplying] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<ItemDto[] | null>(null);
	const busy = isApplying || isDeleting;
	const [error, setError] = useState<string | null>(null);
	const [presetsOpen, setPresetsOpen] = useState(false);
	const [presetMemoryType, setPresetMemoryType] =
		useState<PresetMemoryType>('eMMC');
	const [previewPage, setPreviewPage] = useState(1);
	const [previewPageSize, setPreviewPageSize] = useState(20);
	const [showAllProperties, setShowAllProperties] = useState(false);

	// A new condition set is a new result list - start it from its first page.
	useEffect(() => {
		setPreviewPage(1);
	}, [conditions]);

	useEffect(() => {
		try {
			localStorage.setItem(HINT_STORAGE_KEY, String(hintVisible));
		} catch {
			// private browsing, storage full, etc. - won't persist
		}
	}, [hintVisible]);

	const readyFilters = toFieldFilters(conditions);
	// filterRowsByFields matches every row against zero filters (vacuous
	// `[].every(...)` truth), so "nothing's configured yet" - the state every
	// panel opens in - has to be handled as "match nothing" here instead of
	// falling through to that and selecting every row by default.
	const matched =
		readyFilters.length > 0 ? filterRowsByFields(items, readyFilters) : [];

	const previewTotalPages = Math.max(
		1,
		Math.ceil(matched.length / previewPageSize),
	);
	// Clamped so a shrinking match set (e.g. items refetched after an apply)
	// never leaves the preview on a page past the end.
	const currentPreviewPage = Math.min(previewPage, previewTotalPages);
	const previewRows = matched.slice(
		(currentPreviewPage - 1) * previewPageSize,
		currentPreviewPage * previewPageSize,
	);

	function applyPreset(memoryType: PresetMemoryType, size: PresetSize) {
		setConditions(presetConditions(memoryType, size));
		setActions((current) => {
			if (current.some((action) => action.field === 'fiyat')) return current;
			if (current.length === 1 && current[0].field === 'bellekTipi' && current[0].value === '') return [{ field: 'fiyat', value: '' }];
			return [...current, { field: 'fiyat', value: '' }];
		});
		setError(null);
	}

	const activePresetSize = PRESET_SIZES.find((size) =>
		isPresetActive(conditions, presetMemoryType, size),
	);

	function handlePresetMemoryTypeChange(memoryType: PresetMemoryType) {
		setPresetMemoryType(memoryType);
		// Switching type while a size is selected re-targets that same size.
		if (activePresetSize) applyPreset(memoryType, activePresetSize);
	}

	async function applyChange(target: { matched: ItemDto[]; fields: Partial<EditableInventoryItem> }) {
		if (busy) return;
		setIsApplying(true);
		try {
			await onApply(target.matched, target.fields);
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Güncelleme başarısız');
		} finally {
			setIsApplying(false);
		}
	}

	function handleApplyClick() {
		if (matched.length === 0 || busy) return;
		try {
			const target = { matched: [...matched], fields: buildBulkFields(actions) };
			setError(null);
			if (requireApproval) setPendingBulk(target);
			else void applyChange(target);
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Geçersiz değişiklik');
		}
	}

	async function deleteMatched(target: ItemDto[]) {
		if (!onDelete || busy) return;
		setIsDeleting(true);
		setError(null);
		try { await onDelete(target); }
		catch (error) { setError(error instanceof Error ? error.message : 'Toplu silme başarısız'); }
		finally { setIsDeleting(false); }
	}

	return (
		<div className='mb-3 flex flex-col gap-3 rounded-xl bg-button-bg p-3 text-sm'>
			<button
				type='button'
				onClick={() => setIsOpen((o) => !o)}
				className='flex items-center justify-between gap-2 text-left font-medium'
			>
				<span className='flex items-center gap-2'>
					Toplu Düzenleme
					{matched.length > 0 && (
						<span className='rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400'>
							{matched.length} eşleşen
						</span>
					)}
				</span>
				{isOpen ? (
					<ChevronDown className='h-4 w-4 shrink-0' />
				) : (
					<ChevronRight className='h-4 w-4 shrink-0' />
				)}
			</button>

			{isOpen && (
				<FilterWorkspace
					conditions={conditions.filter((condition) => condition.op === 'exists' || condition.op === 'notExists' || condition.value.trim() !== '')}
					onLoad={(saved) => {
						setConditions(saved.map((condition) => ({ ...newCondition(), ...condition })));
						setError(null);
					}}
				>
					<div className='flex flex-col gap-1'>
						<button
							type='button'
							onClick={() => setHintVisible((v) => !v)}
							className='flex items-center gap-1 self-start text-xs opacity-60 hover:opacity-100'
						>
							<Lightbulb className='h-3.5 w-3.5' />
							{hintVisible ? 'İpucunu gizle' : 'Nasıl çalışır?'}
						</button>
						{hintVisible && (
							<div className='flex flex-col gap-1.5 rounded-lg bg-button-focus-bg/60 p-2 text-xs opacity-80'>
								<p>
									Önce koşullarla hangi ürünlerin etkileneceğini seçin (ör.
									Bellek Türü eşittir "UFS"), sonra hangi alanın hangi değere
									değişeceğini belirtip aşağıdaki "Eşleşen N öğeyi güncelle"
									düğmesine basın - eşleşen tüm ürünler tek seferde güncellenir.
								</p>
								<ul className='flex flex-col gap-1 pl-4 list-disc'>
									<li>
										<b>İçerir</b>: girdiğiniz metni herhangi bir yerinde geçiren
										ürünleri eşleştirir (ör. "128" hem "128GB" hem "1280" ile
										eşleşir).
									</li>
									<li>
										<b>Şunlardan biri / hiçbiri değil</b>: virgülle ayrılmış
										birden çok değer girin (ör. "UFS, EMMC") - bu değerlerden
										birine eşit olan (ya da hiçbirine eşit olmayan) ürünleri
										eşleştirir.
									</li>
									<li>
										<b>Değeri var / yok</b>: bir değer girmenize gerekmez -
										alanı dolu ya da boş olan ürünleri eşleştirir.
									</li>
								</ul>
							</div>
						)}
					</div>

					<div className='flex flex-col gap-2'>
						<button
							type='button'
							onClick={() => setPresetsOpen((o) => !o)}
							className='flex items-center gap-1 self-start rounded-xl bg-button-focus-bg px-2 py-1 text-xs font-medium hover:bg-button-hover-bg'
						>
							{presetsOpen ? (
								<ChevronDown className='h-3.5 w-3.5' />
							) : (
								<ChevronRight className='h-3.5 w-3.5' />
							)}
							Hazır Değişiklikler
						</button>
						{presetsOpen && (
							<div className='flex flex-wrap items-center gap-2 rounded-lg bg-button-focus-bg/60 p-2'>
								<select
									aria-label='IC türü'
									value={presetMemoryType}
									onChange={(e) =>
										handlePresetMemoryTypeChange(
											e.target.value as PresetMemoryType,
										)
									}
									className='rounded-xl bg-button-focus-bg px-2 py-1'
								>
									{PRESET_MEMORY_TYPES.map((type) => (
										<option key={type} value={type}>
											{type === 'all' ? 'Tüm IC türleri' : type}
										</option>
									))}
								</select>
								{PRESET_SIZES.map((size) => {
									const active = size === activePresetSize;
									return (
										<button
											key={size.label}
											type='button'
											onClick={() => applyPreset(presetMemoryType, size)}
											aria-pressed={active}
											className={`rounded-xl px-2 py-1 text-xs font-medium hover:bg-button-hover-bg ${
												active
													? 'bg-button-hover-bg ring-1 ring-text/40'
													: 'bg-button-focus-bg'
											}`}
										>
											{size.label}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<FilterConditionEditor conditions={conditions} onChange={setConditions} />
					<fieldset disabled={busy} className='flex flex-col gap-2 border-t border-border pt-3'>
						<legend>Değiştirilecek alanlar</legend>
						<BulkActionEditor actions={actions} onChange={(update) => {
							setActions(update);
							setError(null);
						}} />
						<button
							type='button'
							onClick={handleApplyClick}
							disabled={matched.length === 0 || busy}
							className='self-start rounded-xl bg-button-focus-bg px-3 py-1.5 disabled:opacity-40'
						>
							{isApplying ? 'Güncelleniyor...' : <>Eşleşen <strong className='text-red-600 dark:text-red-400'>{matched.length}</strong> öğeyi güncelle</>}
						</button>
					</fieldset>
					{onDelete && <div className='flex flex-col items-start gap-1 border-t border-border pt-3'>
						<button
							type='button'
							disabled={matched.length === 0 || matched.length > 1000 || busy}
							onClick={() => { setError(null); setPendingDelete([...matched]); }}
							className='rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-1.5 font-medium text-red-600 hover:bg-red-500/20 disabled:opacity-40 dark:text-red-400'
						>
							{isDeleting ? 'Siliniyor...' : `Eşleşen ${matched.length} öğeyi sil`}
						</button>
						{matched.length > 1000 && <p className='text-xs text-amber-700 dark:text-amber-300'>Tek seferde en fazla 1000 öğe silinebilir. Filtrenizi daraltın.</p>}
					</div>}
					<div className='flex flex-col gap-1 border-t border-border pt-3'>
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<span>
								Etkilenecek <strong className='text-red-600 dark:text-red-400'>{matched.length}</strong> öğe:
							</span>
							<label className='flex cursor-pointer items-center gap-2 text-xs'>
								<input type='checkbox' checked={showAllProperties} onChange={(event) => setShowAllProperties(event.target.checked)} />
								Tüm özellikleri göster
							</label>
						</div>
						{showAllProperties && <p className='text-xs text-amber-700 dark:text-amber-300'>Vurgulanan alanlar değiştirilecek; diğer özellikler mevcut değerlerdir.</p>}
						{matched.length === 0 ? (
							<p className='text-xs opacity-50'>Eşleşen öğe yok</p>
						) : (
							<ul aria-label='Etkilenecek öğeler' className='flex max-h-[60dvh] min-h-64 flex-col gap-2 overflow-y-auto rounded-xl bg-button-focus-bg p-2 text-xs'>
								{previewRows.map((row, index) => (
									<li key={row._id} className='flex flex-col gap-1 border-b border-border py-1'>
										<b><span className='mr-2 font-normal opacity-50'>{(currentPreviewPage - 1) * previewPageSize + index + 1}.</span>{row.model}</b>
										{actions.filter((action) => PREVIEW_FIELDS.has(action.field)).map((action) => {
											const paired = PAIRED_ENUM_FIELD[action.field];
											const oldUnit = paired ? row[paired] : null;
											const newUnit = paired ? actions.find((item) => item.field === paired)?.value ?? oldUnit : null;
											return (
												<span key={action.field} className={showAllProperties ? 'rounded bg-amber-500/10 px-2 py-1 font-medium text-amber-700 dark:text-amber-300' : 'opacity-70'}>
													{fieldLabel(action.field)}: <DisplayValue value={row[action.field] ?? null} />{oldUnit ? ` ${oldUnit}` : ''}
													{' → '}<DisplayValue value={action.value.trim() || null} />{newUnit ? ` ${newUnit}` : ''}
												</span>
											);
										})}
										{showAllProperties && Object.entries(row)
											.filter(([field]) => PREVIEW_FIELDS.has(field) && field !== 'model' && !actions.some((action) => action.field === field))
											.map(([field, value]) => (
												<span key={field} className='px-2 py-0.5 opacity-60'>
													{Object.hasOwn(FIELD_REGISTRY, field) ? fieldLabel(field as FieldKey) : field === 'ram' ? 'RAM' : field === '_id' ? 'Kayıt ID' : field === 'version' ? 'Sürüm' : field}: <DisplayValue value={value ?? null} />
												</span>
											))}
									</li>
								))}
							</ul>
						)}
						{matched.length > 0 && (
							<Pagination
								page={currentPreviewPage}
								totalPages={previewTotalPages}
								onPageChange={setPreviewPage}
								pageSize={previewPageSize}
								onPageSizeChange={(size) => {
									setPreviewPageSize(size);
									setPreviewPage(1);
								}}
								hideNavWhenSinglePage
							/>
						)}
					</div>

					{error && <p className='text-red-500'>{error}</p>}

					{pendingBulk && (
						<ConfirmDialog
							title='Toplu değişikliği onayla'
							message={
								<div className='flex flex-col gap-1'>
									<p><strong className='text-red-600 dark:text-red-400'>{pendingBulk.matched.length}</strong> öğe güncellenecek:</p>
									{Object.entries(pendingBulk.fields).map(([field, value]) => (
										<p key={field}>{fieldLabel(field as FieldKey)}: <DisplayValue value={value ?? null} /></p>
									))}
								</div>
							}
							onConfirm={() => {
								void applyChange(pendingBulk);
								setPendingBulk(null);
							}}
							onCancel={() => setPendingBulk(null)}
							enterEnabled={enterEnabled}
							escapeEnabled={escapeEnabled}
						/>
					)}
					{pendingDelete && <ConfirmDialog
						danger
						title='Toplu silmeyi onayla'
						confirmLabel='Öğeleri sil'
						message={<div className='flex flex-col gap-2'>
							<p><strong className='text-red-600 dark:text-red-400'>{pendingDelete.length}</strong> öğe silinecek ve listeden kaldırılacak.</p>
							<ul className='max-h-40 overflow-y-auto text-xs'>{pendingDelete.map((item, index) => <li key={item._id}>{index + 1}. {item.model}</li>)}</ul>
						</div>}
						onConfirm={() => { void deleteMatched(pendingDelete); setPendingDelete(null); }}
						onCancel={() => setPendingDelete(null)}
						enterEnabled={enterEnabled}
						escapeEnabled={escapeEnabled}
					/>}
				</FilterWorkspace>
			)}
		</div>
	);
}
