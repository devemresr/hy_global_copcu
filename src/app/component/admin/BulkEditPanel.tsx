import { useEffect, useState, type SetStateAction } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import type { EditableField } from '../../types';
import type { ItemDto } from '../../hooks/api/endpoints/useItems';
import { editableInventoryItemSchema } from '../../schemas/item.schema';
import {
	FIELD_REGISTRY,
	FIELD_KEYS,
	EDITABLE_FIELD_KEYS,
	OPS_BY_KIND,
	PAIRED_ENUM_FIELD,
	fieldLabel,
	fieldMeta,
	type FieldKey,
} from '../../constants/fieldRegistry.constant';
import {
	filterRowsByFields,
	type FieldFilter,
	type FieldFilterOp,
} from '../../helpers/inventoryPageHelpers/fieldFilter.helper';
import { ConfirmDialog } from './ConfirmDialog';
import { DisplayValue } from './DisplayValue';
import { Pagination } from './Pagination';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';

// Data-import bookkeeping fields, not something an admin filters on.
const HIDDEN_FILTER_FIELDS: FieldKey[] = [
	'uretici',
	'eslesmeTuru',
	'sorgulananDeger',
];

// Every field a condition can filter/match on - FIELD_REGISTRY minus the
// hidden ones above.
const FILTER_FIELDS = FIELD_KEYS.filter(
	(key) => !HIDDEN_FILTER_FIELDS.includes(key),
).map((value) => ({
	value,
	label: fieldLabel(value),
}));

// Only the fields a bulk action is allowed to write - derived from the same
// FIELD_REGISTRY as EditableField (types.ts) instead of restating the list,
// so the two can't drift apart.
const ACTION_FIELDS = EDITABLE_FIELD_KEYS.map((value) => ({
	value,
	label: fieldLabel(value),
}));

// Every operator a condition can use, with its label. Which of these are
// actually offered for a given condition depends on that condition's field -
// see opsForField, backed by FIELD_REGISTRY's per-field `kind` and
// OPS_BY_KIND (a string field like "model" has no use for gte, a number
// field like "fiyat" has no use for contains).
const ALL_OPS: { value: FieldFilterOp; label: string; needsValue: boolean }[] =
	[
		{ value: 'equals', label: 'Eşittir', needsValue: true },
		{ value: 'notEquals', label: 'Eşit değildir', needsValue: true },
		{ value: 'contains', label: 'İçerir', needsValue: true },
		{
			value: 'in',
			label: 'Şunlardan biri (virgülle ayırın)',
			needsValue: true,
		},
		{
			value: 'notIn',
			label: 'Şunların hiçbiri değil (virgülle ayırın)',
			needsValue: true,
		},
		{ value: 'gt', label: 'Büyüktür', needsValue: true },
		{ value: 'gte', label: 'Büyük veya eşittir', needsValue: true },
		{ value: 'lt', label: 'Küçüktür', needsValue: true },
		{ value: 'lte', label: 'Küçük veya eşittir', needsValue: true },
		{ value: 'exists', label: 'Değeri var', needsValue: false },
		{ value: 'notExists', label: 'Değeri yok', needsValue: false },
	];

function opsForField(field: string) {
	const kind = FIELD_REGISTRY[field as FieldKey]?.kind ?? 'string';
	const allowed = OPS_BY_KIND[kind];
	return ALL_OPS.filter((o) => allowed.includes(o.value));
}

type Condition = {
	id: string;
	field: string;
	op: FieldFilterOp;
	value: string;
};

let nextConditionId = 0;

function newCondition(): Condition {
	// Just a React list key, not a security-sensitive id - avoids depending on
	// crypto.randomUUID, which browsers only expose in a secure context (HTTPS).
	return {
		id: `${Date.now()}-${nextConditionId++}`,
		field: 'bellekTipi',
		op: 'equals',
		value: '',
	};
}

// Only conditions with everything they need to actually filter make it into
// the real FieldFilter list - a half-filled row (op picked, value still
// blank) is just in-progress typing, not "match nothing".
function toFieldFilters(conditions: Condition[]): FieldFilter[] {
	return conditions
		.filter(
			(c) => c.op === 'exists' || c.op === 'notExists' || c.value.trim() !== '',
		)
		.map((c) => ({
			field: c.field,
			op: c.op,
			value:
				c.op === 'in' || c.op === 'notIn'
					? c.value
							.split(',')
							.map((v) => v.trim())
							.filter(Boolean)
					: c.value,
		}));
}

// "Hazır değişiklikler": one click fills the conditions for a bellekTipi +
// storage size combination and points the action at fiyat, so the admin only
// has to type the new price - the apply/confirm flow stays the regular one.
const PRESET_MEMORY_TYPES = ['eMMC', 'eMCP'] as const;
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
		{ ...newCondition(), field: 'bellekTipi', value: memoryType },
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
	items: ItemDto[];
	requireApproval: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	onApply: (
		matched: ItemDto[],
		field: EditableField,
		newValue: string | number | null,
	) => void | Promise<void>;
};

// Rule-based bulk edit: build up filter conditions (field + operator + value,
// same shape as FieldFilter/FieldFilterOp) to select a set of items, then
// apply one field change to all of them at once - e.g. every item with
// bellekTipi "EMMC" changed to "UFS" in one step instead of one row at a time.
export function BulkEditPanel({
	items,
	requireApproval,
	enterEnabled,
	escapeEnabled,
	onApply,
}: BulkEditPanelProps) {
	// Closed by default - a bulk action touches many rows at once and shouldn't
	// carry the same visual weight as a single field/row edit.
	const [isOpen, setIsOpen] = useState(false);
	const [hintVisible, setHintVisible] = useState(loadHintVisible);
	const [conditions, setConditions] = useState<Condition[]>([newCondition()]);
	const [actionField, setActionField] = useState<EditableField>('bellekTipi');
	const [actionValue, setActionValue] = useState('');
	const [confirmingBulk, setConfirmingBulk] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [presetsOpen, setPresetsOpen] = useState(false);
	const [presetMemoryType, setPresetMemoryType] =
		useState<PresetMemoryType>('eMMC');
	const [previewPage, setPreviewPage] = useState(1);
	const [previewPageSize, setPreviewPageSize] = useState(20);

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
	const actionLabel =
		ACTION_FIELDS.find((f) => f.value === actionField)?.label ?? actionField;

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

	function updateCondition(id: string, patch: Partial<Condition>) {
		setConditions((prev) =>
			prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
		);
	}

	// Changing a condition's field can leave it pointing at an operator that
	// no longer makes sense (e.g. switching from "fiyat" to "model" while "gte"
	// is selected) - fall back to that field's first allowed operator instead.
	function updateConditionField(id: string, field: string) {
		const allowed = opsForField(field);
		setConditions((prev) =>
			prev.map((c) =>
				c.id === id
					? {
							...c,
							field,
							op: allowed.some((o) => o.value === c.op)
								? c.op
								: allowed[0].value,
							value: '',
						}
					: c,
			),
		);
	}

	function applyPreset(memoryType: PresetMemoryType, size: PresetSize) {
		setConditions(presetConditions(memoryType, size));
		// Keep a price the admin already typed when hopping between presets.
		if (actionField !== 'fiyat') {
			setActionField('fiyat');
			setActionValue('');
		}
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

	const actionFieldMeta = fieldMeta(actionField);

	// NumberInputWithSteppers works in number|'' - `actionValue` itself stays a
	// string since this same state also backs the plain text/select inputs
	// above for a string/enum-kind actionField.
	const numericActionValue: number | '' =
		actionValue.trim() === '' ? '' : Number(actionValue);
	function handleNumericActionChange(update: SetStateAction<number | ''>) {
		setActionValue((prev) => {
			const prevNumeric: number | '' = prev.trim() === '' ? '' : Number(prev);
			const next =
				typeof update === 'function'
					? (update as (p: number | '') => number | '')(prevNumeric)
					: update;
			return next === '' ? '' : String(next);
		});
		setError(null);
	}

	// Raw text input coerced into the shape editableInventoryItemSchema expects
	// for actionField, before validation - same rule FieldEditModal's
	// candidateValue uses for a single-field edit.
	function candidateActionValue(): string | number | null {
		if (actionFieldMeta.kind === 'number') {
			const trimmed = actionValue.trim();
			return trimmed === '' ? null : Number(trimmed);
		}
		return actionFieldMeta.kind === 'enum'
			? actionValue
			: actionValue.trim() || null;
	}

	// Bulk-editing a matched set fires one PATCH per row (see Admin.tsx's
	// commitBulkFieldChange), so it can stay in flight for a while - isApplying
	// keeps a second click from starting an overlapping batch on the same rows
	// while the first one is still running.
	async function applyChange(newValue: string | number | null) {
		setIsApplying(true);
		try {
			await onApply(matched, actionField, newValue);
		} finally {
			setIsApplying(false);
		}
	}

	function handleApplyClick() {
		if (matched.length === 0 || isApplying) return;
		const result = editableInventoryItemSchema.shape[actionField].safeParse(
			candidateActionValue(),
		);
		if (!result.success) {
			setError(result.error.issues[0].message);
			return;
		}
		setError(null);
		if (requireApproval) {
			setConfirmingBulk(true);
		} else {
			void applyChange(result.data ?? null);
		}
	}

	// The action-value input stays mounted (just visually covered) under the
	// confirm dialog's overlay, so actionValue could in principle still change
	// before Onayla is clicked - re-validates with safeParse rather than the
	// throwing form handleApplyClick already used, falling back to null
	// instead of crashing the page if it somehow no longer passes.
	function confirmedActionValue(): string | number | null {
		const result = editableInventoryItemSchema.shape[actionField].safeParse(
			candidateActionValue(),
		);
		return result.success ? (result.data ?? null) : null;
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
						<span className='rounded-full bg-button-focus-bg px-2 py-0.5 text-xs font-normal opacity-70'>
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
				<>
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
											{type}
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

					<div className='flex flex-col gap-2'>
						{conditions.map((c) => {
							const opMeta = ALL_OPS.find((o) => o.value === c.op);
							const valueOptions = fieldMeta(c.field as FieldKey).options;
							return (
								<div key={c.id} className='flex flex-col gap-2 min-[426px]:flex-row min-[426px]:flex-wrap min-[426px]:items-center'>
									<select
										value={c.field}
										onChange={(e) => updateConditionField(c.id, e.target.value)}
										className='rounded-xl bg-button-focus-bg px-2 py-1'
									>
										{FILTER_FIELDS.map((f) => (
											<option key={f.value} value={f.value}>
												{f.label}
											</option>
										))}
									</select>
									<select
										value={c.op}
										onChange={(e) =>
											updateCondition(c.id, {
												op: e.target.value as FieldFilterOp,
											})
										}
										className='rounded-xl bg-button-focus-bg px-2 py-1'
									>
										{opsForField(c.field).map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
									{opMeta?.needsValue && valueOptions && (
										<select
											value={c.value}
											onChange={(e) =>
												updateCondition(c.id, { value: e.target.value })
											}
											className='rounded-xl bg-button-focus-bg px-2 py-1'
										>
											<option value=''>Seçin</option>
											{valueOptions.map((opt) => (
												<option key={opt.value} value={opt.value}>
													{opt.label}
												</option>
											))}
										</select>
									)}
									{opMeta?.needsValue && !valueOptions && (
										<input
											type='text'
											value={c.value}
											onChange={(e) =>
												updateCondition(c.id, { value: e.target.value })
											}
											placeholder='Değer'
											className='min-[426px]:field-sizing-content min-[426px]:min-w-32 min-[426px]:max-w-[33rem] rounded-xl bg-button-focus-bg px-2 py-1'
										/>
									)}
									{conditions.length > 1 && (
										<button
											type='button'
											onClick={() =>
												setConditions((prev) =>
													prev.filter((cond) => cond.id !== c.id),
												)
											}
											aria-label='Koşulu sil'
											className='rounded-xl px-2 py-1 hover:bg-button-hover-bg'
										>
											×
										</button>
									)}
								</div>
							);
						})}
						<button
							type='button'
							onClick={() => setConditions((prev) => [...prev, newCondition()])}
							className='self-start rounded-xl bg-button-focus-bg px-2 py-1 text-xs font-medium hover:bg-button-hover-bg'
						>
							+ Koşul Ekle
						</button>
					</div>

					<div className='flex flex-col gap-2 border-t border-border pt-3 min-[426px]:flex-row min-[426px]:flex-wrap min-[426px]:items-center'>
						<span className='opacity-70'>Değiştir:</span>
						<select
							value={actionField}
							onChange={(e) => {
								setActionField(e.target.value as EditableField);
								setActionValue('');
								setError(null);
							}}
							className='rounded-xl bg-button-focus-bg px-2 py-1'
						>
							{ACTION_FIELDS.map((f) => (
								<option key={f.value} value={f.value}>
									{f.label}
								</option>
							))}
						</select>
						<span className='opacity-70'>→</span>
						{actionFieldMeta.options ? (
							<select
								value={actionValue}
								onChange={(e) => setActionValue(e.target.value)}
								className='rounded-xl bg-button-focus-bg px-2 py-1'
							>
								<option value=''>Seçin</option>
								{actionFieldMeta.options.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						) : actionFieldMeta.kind === 'number' ? (
							<NumberInputWithSteppers
								id={`bulk-action-${actionField}`}
								value={numericActionValue}
								steppers={actionFieldMeta.stepperValues}
								className='min-[426px]:w-fit rounded-xl bg-button-focus-bg px-2 py-1'
								stepperClassName='px-1.5 leading-5 rounded-md'
								onChange={handleNumericActionChange}
							/>
						) : (
							<input
								type='text'
								value={actionValue}
								onChange={(e) => {
									setActionValue(e.target.value);
									setError(null);
								}}
								placeholder='Yeni değer'
								className='min-[426px]:field-sizing-content min-[426px]:min-w-32 min-[426px]:max-w-[33rem] rounded-xl bg-button-focus-bg px-2 py-1'
							/>
						)}
						<button
							type='button'
							onClick={handleApplyClick}
							disabled={matched.length === 0 || isApplying}
							className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg disabled:opacity-40'
						>
							{isApplying
								? 'Güncelleniyor...'
								: `Eşleşen ${matched.length} öğeyi güncelle`}
						</button>
					</div>

					<div className='flex flex-col gap-1 border-t border-border pt-3'>
						<span className='opacity-70'>
							Etkilenecek {matched.length} öğe:
						</span>
						{matched.length === 0 ? (
							<p className='text-xs opacity-50'>Eşleşen öğe yok</p>
						) : (
							<ul className='flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl bg-button-focus-bg p-2 text-xs'>
								{previewRows.map((row) => {
									// The unit/currency itself isn't part of this bulk action
									// (see PAIRED_ENUM_FIELD's own comment), so a row keeps
									// whatever it already had - shown alongside both the old
									// and new magnitude so it's clear what unit they're in.
									const pairedField = PAIRED_ENUM_FIELD[actionField];
									const unit = pairedField
										? (row[pairedField as keyof ItemDto] as
												| string
												| null
												| undefined)
										: null;
									return (
										<li key={row._id} className='flex justify-between gap-2'>
											<span className='truncate'>{row.model}</span>
											<span className='shrink-0 opacity-60'>
												<DisplayValue
													value={row[actionField] as string | number | null}
												/>
												{unit ? ` ${unit}` : ''} →{' '}
												<DisplayValue value={actionValue.trim() || null} />
												{unit ? ` ${unit}` : ''}
											</span>
										</li>
									);
								})}
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

					{confirmingBulk && (
						<ConfirmDialog
							title='Toplu değişikliği onayla'
							message={
								<>
									<b>{matched.length}</b> öğenin <b>{actionLabel}</b> alanı{' '}
									<b>
										<DisplayValue value={actionValue.trim() || null} />
									</b>{' '}
									olarak güncellenecek.
								</>
							}
							onConfirm={() => {
								void applyChange(confirmedActionValue());
								setConfirmingBulk(false);
							}}
							onCancel={() => setConfirmingBulk(false)}
							enterEnabled={enterEnabled}
							escapeEnabled={escapeEnabled}
						/>
					)}
				</>
			)}
		</div>
	);
}
