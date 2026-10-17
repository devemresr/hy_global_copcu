import { useEffect, useState, type SetStateAction } from 'react';
import { X } from 'lucide-react';
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

type ItemEditModalProps = {
	item: EditableInventoryItem;
	onClose: () => void;
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
	onSave,
	isSaving = false,
	enterEnabled,
	escapeEnabled,
	mode = 'edit',
	rules = [],
}: ItemEditModalProps) {
	const [draft, setDraft] = useState<EditableInventoryItem>({ ...item });
	const [overrides, setOverrides] = useState<Set<EditableField>>(new Set());
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setDraft({ ...item });
		setOverrides(new Set());
		setError(null);
	}, [item]);

	// Keep manual values separate: removing a match restores the user's draft.
	// Display and submission always use the same resolved item.
	const resolved: RuleResolution =
		mode === 'create'
			? resolveItemRules(draft, rules, overrides)
			: { item: draft, sources: {} };
	const values = resolved.item;
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
	useModalHotkeys(handleSave, onClose, { enterEnabled, escapeEnabled });

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
			onClick={onClose}
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
					<button
						type='button'
						aria-label='Kapat'
						className='h-7 w-7'
						onClick={onClose}
					>
						<X className='h-full w-full' />
					</button>
				</div>
				<div className='flex flex-col gap-3 text-sm'>
					{EDITABLE_FIELD_KEYS.map((field) => {
						const meta = fieldMeta(field);
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
								{meta.options ? (
									<select
										id={id}
										aria-describedby={rule ? `${id}-rule` : undefined}
										disabled={locked || isSaving}
										value={String(values[field] ?? '')}
										onChange={(event) => updateField(field, event.target.value)}
										className='rounded-xl bg-button-bg px-2 py-1.5 disabled:opacity-60'
									>
										{meta.options.map((option) => (
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
						onClick={onClose}
						className='rounded-xl bg-button-bg px-3 py-1.5 text-sm'
					>
						Vazgeç
					</button>
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
