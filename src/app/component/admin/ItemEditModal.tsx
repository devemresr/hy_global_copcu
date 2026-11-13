import { PRICE_UNIT_OPTIONS } from '../../constants/priceUnits.constant';
import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useState, type SetStateAction } from 'react';

import type { EditableField, EditableInventoryItem } from '../../types';
import { editableInventoryItemSchema } from '../../schemas/item.schema';
import {
	EDITABLE_FIELD_KEYS,
	fieldMeta,
} from '../../constants/fieldRegistry.constant';
import {
	resolveItemRules,
	type ItemRule,
	type RuleResolution,
} from '../../helpers/adminPageHelpers/itemRules.helper';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import {
	PurchaseProductSelect,
	type PurchaseProductChoice,
} from './PurchaseProductSelect';
import { purchaseChoices } from '../../helpers/purchaseChoices.helper';

const PRODUCT_FIELDS = new Set<EditableField>([
	'bellekTipi',
	'depolama',
	'depolamaBirimi',
]);

function initialProduct(item: EditableInventoryItem): PurchaseProductChoice {
	const memoryGb =
		item.depolama == null
			? null
			: item.depolama * (item.depolamaBirimi === 'TB' ? 1024 : 1);
	return (
		purchaseChoices().find(
			(choice) =>
				choice.type === item.bellekTipi?.toUpperCase() &&
				choice.memoryGb === memoryGb,
		) ?? purchaseChoices()[0]
	);
}

type ItemEditModalProps = {
	item: EditableInventoryItem;
	onClose: () => void;
	closeOnOutsideClick?: boolean;
	onSave: (updated: EditableInventoryItem) => void;
	isSaving?: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	mode?: 'edit' | 'create';
	rules?: readonly ItemRule[];
};

export function ItemEditModal({
	item,
	onClose,
	closeOnOutsideClick = true,
	onSave,
	isSaving = false,
	enterEnabled,
	escapeEnabled,
	mode = 'edit',
	rules = [],
}: ItemEditModalProps) {
	const [draft, setDraft] = useState<EditableInventoryItem>({
		...item,
		fiyatBirimi: item.fiyatBirimi ?? 'piece',
	});
	const [overrides, setOverrides] = useState<Set<EditableField>>(new Set());
	const [product, setProduct] = useState(() => initialProduct(item));
	const [error, setError] = useState<string | null>(null);
	const [previousItem, setPreviousItem] = useState(item);
	if (item !== previousItem) {
		setPreviousItem(item);
		setDraft({ ...item, fiyatBirimi: item.fiyatBirimi ?? 'piece' });
		setOverrides(new Set());
		setProduct(initialProduct(item));
		setError(null);
	}

	// Keep manual values separate: removing a match restores the user's draft.
	// Display and submission always use the same resolved item.
	const productDraft: EditableInventoryItem = {
		...draft,
		bellekTipi: product.type,
		depolama: product.memoryGb,
		depolamaBirimi: 'GB',
		ram: product.requiresMemorySize ? draft.ram : null,
	};
	const resolved: RuleResolution =
		mode === 'create'
			? resolveItemRules(
					productDraft,
					rules,
					new Set([...overrides, ...PRODUCT_FIELDS]),
				)
			: { item: draft, sources: {} };
	const values = resolved.item;
	const fields = EDITABLE_FIELD_KEYS.filter(
		(field) => mode !== 'create' || !PRODUCT_FIELDS.has(field),
	);
	function updateField(field: EditableField, value: string | number | null) {
		if (isSaving || (resolved.sources[field] && !overrides.has(field))) return;
		setDraft((current) => ({ ...current, [field]: value }));
		setError(null);
	}
	function updateNumber(
		field: EditableField,
		update: SetStateAction<number | ''>,
	) {
		const current =
			typeof values[field] === 'number' ? (values[field] as number) : '';
		const next = typeof update === 'function' ? update(current) : update;
		updateField(field, next === '' ? null : next);
	}
	function toggleOverride(field: EditableField, enabled: boolean) {
		if (enabled)
			setDraft((current) => ({ ...current, [field]: values[field] }));
		setOverrides((current) => {
			const next = new Set(current);
			if (enabled) next.add(field);
			else next.delete(field);
			return next;
		});
		setError(null);
	}
	function handleSave() {
		if (isSaving) return;
		const parsed = editableInventoryItemSchema.safeParse(values);
		if (!parsed.success) {
			setError(parsed.error.issues[0].message);
			return;
		}
		setError(null);
		onSave(parsed.data);
	}
	useModalHotkeys(
		handleSave,
		() => {
			if (!isSaving) onClose();
		},
		{ enterEnabled, escapeEnabled },
	);
	const dismiss = useModalDismiss(onClose, {
		closeOnOutsideClick,
		disabled: isSaving,
		escapeEnabled,
	});

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
			{...dismiss}
		>
			<div
				role='dialog'
				aria-modal='true'
				aria-label={mode === 'create' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}
				className='max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-modal-bg p-4 text-text'
				onClick={(event) => event.stopPropagation()}
			>
				<div className='mb-4 flex items-center justify-between'>
					<h2 className='text-sm font-semibold'>
						{mode === 'create' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}
					</h2>
					<ModalCloseButton onClick={onClose} disabled={isSaving} />
				</div>
				<div className='flex flex-col gap-3 text-sm'>
					{mode === 'create' && (
						<>
							<fieldset disabled={isSaving} className='flex flex-col gap-2'>
								<legend className='mb-2 text-text/70'>Bellek bilgisi</legend>
								{[true, false].map((hasMemory) => (
									<label
										key={String(hasMemory)}
										className='flex items-center gap-2'
									>
										<input
											type='radio'
											name='item-memory-info'
											checked={product.requiresMemorySize === hasMemory}
											onChange={() => {
												setProduct(
													purchaseChoices().find(
														(choice) => choice.requiresMemorySize === hasMemory,
													)!,
												);
												setError(null);
											}}
										/>
										{hasMemory ? 'Bellek bilgisi var' : 'Bellek bilgisi yok'}
									</label>
								))}
							</fieldset>
							<div className='flex flex-col gap-1'>
								<label htmlFor='item-create-product' className='text-text/70'>
									Ürün
								</label>
								<PurchaseProductSelect
									id='item-create-product'
									value={product}
									onChange={(choice) => {
										setProduct(choice);
										setError(null);
									}}
									disabled={isSaving}
									rowNumber={1}
									requiresMemorySize={product.requiresMemorySize}
								/>
							</div>
						</>
					)}
					{fields.map((field) => {
						const meta = fieldMeta(field);
						const options =
							field === 'bellekTipi'
								? [
										{ value: 'EMCP', label: 'eMCP' },
										{ value: 'EMMC', label: 'eMMC' },
									]
								: meta.options;
						const rule = resolved.sources[field];
						const custom = overrides.has(field);
						const locked = Boolean(rule && !custom);
						const id = `item-edit-${field}`;
						return (
							<div key={field} className='flex min-w-0 flex-col gap-1'>
								<div className='flex flex-wrap items-center justify-between gap-2'>
									<label htmlFor={id} className='opacity-70'>
										{meta.label}
									</label>
									{rule && (
										<label className='flex items-center gap-1 text-xs'>
											<input
												type='checkbox'
												aria-label={`${meta.label}: Özel değer kullan`}
												checked={custom}
												disabled={isSaving}
												onChange={(event) =>
													toggleOverride(field, event.target.checked)
												}
											/>
											Özel değer kullan
										</label>
									)}
								</div>
								{field === 'fiyatBirimi' ? (
									<div
										id={id}
										role='group'
										aria-label={meta.label}
										className='flex gap-1'
									>
										{PRICE_UNIT_OPTIONS.map((option) => (
											<button
												key={option.value}
												type='button'
												disabled={locked || isSaving}
												aria-pressed={
													(values.fiyatBirimi ?? 'piece') === option.value
												}
												onClick={() => updateField(field, option.value)}
												className={
													'min-h-9 rounded-full border border-border px-3 py-1.5 text-xs ' +
													((values.fiyatBirimi ?? 'piece') === option.value
														? 'bg-text text-bg'
														: 'bg-button-bg')
												}
											>
												{option.label}
											</button>
										))}
									</div>
								) : options ? (
									<select
										id={id}
										aria-describedby={rule ? `${id}-rule` : undefined}
										disabled={locked || isSaving}
										value={String(values[field] ?? '')}
										onChange={(event) => updateField(field, event.target.value)}
										className='rounded-xl bg-button-bg px-2 py-1.5 disabled:opacity-60'
									>
										{field === 'bellekTipi' &&
											!options.some(
												(option) =>
													option.value === String(values[field] ?? ''),
											) && (
												<option
													value={String(values[field] ?? '')}
													disabled
													hidden
												>
													{values[field]
														? String(values[field])
														: 'Bellek türü seçin'}
												</option>
											)}
										{options.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								) : meta.kind === 'number' ? (
									<NumberInputWithSteppers
										id={id}
										disabled={locked || isSaving}
										describedBy={rule ? `${id}-rule` : undefined}
										storage={field === 'depolama'}
										value={
											typeof values[field] === 'number'
												? (values[field] as number)
												: ''
										}
										onChange={(update) => updateNumber(field, update)}
										steppers={meta.stepperValues}
										className='w-fit rounded-xl bg-button-bg px-2 py-1.5'
										stepperClassName='rounded-md px-1.5 leading-5'
									/>
								) : (
									<input
										id={id}
										type='text'
										disabled={locked || isSaving}
										aria-describedby={rule ? `${id}-rule` : undefined}
										value={String(values[field] ?? '')}
										onChange={(event) =>
											updateField(
												field,
												event.target.value.trim() === '' && field !== 'model'
													? null
													: event.target.value,
											)
										}
										className='rounded-xl bg-button-bg px-2 py-1.5 outline-none disabled:opacity-60'
									/>
								)}
								{field === 'fiyatBirimi' && (
									<p className='text-xs text-text/60'>
										Fiyat seçilen birim başınadır. Birimi değiştirmek fiyat
										tutarını veya geçmiş stok kayıtlarını dönüştürmez.
									</p>
								)}
								{rule && (
									<p
										id={`${id}-rule`}
										role='status'
										className='text-xs text-amber-700 dark:text-amber-300'
									>
										Kural: <b>{rule.name}</b>.{' '}
										{custom
											? 'Bu kuralın dışında özel bi değer girin.'
											: 'Varsayılan değer uygulandı. Değiştirmek için “Özel değer kullan”ı işaretleyin. Bunu yaparak kuralın dışında özel bi değer girmiş olursunuz.'}
									</p>
								)}
							</div>
						);
					})}
					{error && (
						<p role='alert' className='text-sm text-red-500'>
							{error}
						</p>
					)}
				</div>
				<div className='mt-5 flex justify-end gap-2'>
					<button
						type='button'
						onClick={handleSave}
						disabled={isSaving}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm disabled:opacity-40'
					>
						{isSaving
							? 'Kaydediliyor...'
							: mode === 'create'
								? 'Ekle'
								: 'Kaydet'}
					</button>
				</div>
			</div>
		</div>
	);
}
