import { useState } from 'react';
import type { EditableField, EditableInventoryItem } from '../../types';
import type { ItemDto } from '../../hooks/api/endpoints/useItems';
import { editableInventoryItemSchema } from '../../schemas/item.schema';
import { fieldMeta, PAIRED_ENUM_FIELD } from '../../constants/fieldRegistry.constant';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';
import CancelIcon from '../../assets/icons/icons8-cancel.svg?react';
import { ConfirmDialog } from './ConfirmDialog';

type FieldEditModalProps = {
	row: ItemDto;
	field: EditableField;
	label: string;
	requireApproval: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	onClose: () => void;
	onConfirm: (changes: Partial<EditableInventoryItem>) => void;
};

// Edits exactly one field of one row - opened by a cell's edit button rather
// than ItemEditModal's whole-row form. When requireApproval is on, Save
// doesn't commit directly; it swaps this modal for a confirm step showing
// the old -> new value, and onConfirm only fires once that's accepted.
export function FieldEditModal({
	row,
	field,
	label,
	requireApproval,
	enterEnabled,
	escapeEnabled,
	onClose,
	onConfirm,
}: FieldEditModalProps) {
	const currentValue = row[field] ?? null;
	const meta = fieldMeta(field);

	// depolama/fiyat are meaningless without their unit/currency, so editing
	// either here also edits its paired field in the same modal - see
	// PAIRED_ENUM_FIELD's own comment.
	const pairedField = PAIRED_ENUM_FIELD[field];
	const pairedMeta = pairedField ? fieldMeta(pairedField) : undefined;
	const currentPairedValue = pairedField ? row[pairedField] : undefined;

	const [value, setValue] = useState(String(currentValue ?? ''));
	const [pairedValue, setPairedValue] = useState(
		String(currentPairedValue ?? pairedMeta?.options?.[0]?.value ?? ''),
	);
	const [awaitingApproval, setAwaitingApproval] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Raw text input coerced into the shape editableInventoryItemSchema
	// expects for this field, before validation - a number-kind field (fiyat,
	// depolama) as a number-or-null, an enum-kind field's value passed through
	// as-is (it's already one of meta.options, picked via a select rather
	// than typed), everything else as a trimmed string-or-null.
	function candidateValue(): string | number | null {
		if (meta.kind === 'number') {
			const trimmed = value.trim();
			return trimmed === '' ? null : Number(trimmed);
		}
		return meta.kind === 'enum' ? value : value.trim() || null;
	}

	// Validates field and (if there is one) its paired field independently
	// against their own schema slices - returns null and sets `error` on the
	// first failure, otherwise the changes to send.
	function validate(): Partial<EditableInventoryItem> | null {
		const result = editableInventoryItemSchema.shape[field].safeParse(
			candidateValue(),
		);
		if (!result.success) {
			setError(result.error.issues[0].message);
			return null;
		}

		// Writing through `field`/`pairedField` (each a union of every editable
		// key) forces TS to require a value assignable to *every* key's type at
		// once, which collapses to nothing useful - built loosely and cast once
		// at the end instead, same as commitFieldChange's caller does.
		const changes: Record<string, unknown> = { [field]: result.data ?? null };

		if (pairedField) {
			const pairedResult =
				editableInventoryItemSchema.shape[pairedField].safeParse(pairedValue);
			if (!pairedResult.success) {
				setError(pairedResult.error.issues[0].message);
				return null;
			}
			changes[pairedField] = pairedResult.data;
		}

		return changes as Partial<EditableInventoryItem>;
	}

	function handleSaveClick() {
		const changes = validate();
		if (!changes) return;
		setError(null);

		if (requireApproval) {
			setAwaitingApproval(true);
		} else {
			onConfirm(changes);
		}
	}

	// Only reached once handleSaveClick has already validated successfully and
	// nothing has changed since - re-parsing here is just to get typed data
	// back out, not a check that can actually fail.
	function confirmedChanges(): Partial<EditableInventoryItem> {
		return validate()!;
	}

	useModalHotkeys(handleSaveClick, onClose, { enterEnabled, escapeEnabled });

	if (awaitingApproval) {
		return (
			<ConfirmDialog
				title='Değişikliği onayla'
				message={
					<>
						<b>{label}</b> alanı{' '}
						<b>
							{String(currentValue ?? '—')}
							{pairedField && currentPairedValue
								? ` ${currentPairedValue}`
								: ''}
						</b>{' '}
						değerinden{' '}
						<b>
							{value.trim() || '—'}
							{pairedField ? ` ${pairedValue}` : ''}
						</b>{' '}
						değerine değiştirilecek.
					</>
				}
				onConfirm={() => onConfirm(confirmedChanges())}
				onCancel={onClose}
				enterEnabled={enterEnabled}
				escapeEnabled={escapeEnabled}
			/>
		);
	}

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
			onClick={onClose}
		>
			<div
				className='w-full max-w-sm bg-modal-bg text-text rounded-xl p-4'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex items-center justify-between mb-4'>
					<span className='text-sm font-semibold'>{label} düzenle</span>
					<button
						type='button'
						className='h-7 w-7 shrink-0'
						onClick={onClose}
						aria-label='Kapat'
					>
						<CancelIcon className='w-full h-full icon' />
					</button>
				</div>

				<div className='flex gap-2'>
					<label
						className={`flex flex-col gap-1 text-sm ${pairedField ? 'flex-1' : 'w-full'}`}
					>
						<span className='opacity-70'>{label}</span>
						{meta.options ? (
							<select
								value={value}
								onChange={(e) => setValue(e.target.value)}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
							>
								{meta.options.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						) : (
							<input
								type={meta.kind === 'number' ? 'number' : 'text'}
								step={meta.kind === 'number' ? '0.01' : undefined}
								min={meta.kind === 'number' ? 0 : undefined}
								value={value}
								onChange={(e) => {
									setValue(e.target.value);
									setError(null);
								}}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
							/>
						)}
					</label>

					{pairedField && pairedMeta?.options && (
						<label className='flex flex-col gap-1 text-sm'>
							<span className='opacity-70'>{pairedMeta.label}</span>
							<select
								value={pairedValue}
								onChange={(e) => {
									setPairedValue(e.target.value);
									setError(null);
								}}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
							>
								{pairedMeta.options.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</label>
					)}
				</div>

				{error && <p className='text-red-500 text-sm mt-2'>{error}</p>}

				<div className='mt-5 flex justify-end gap-2'>
					<button
						type='button'
						onClick={onClose}
						className='rounded-xl bg-button-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						Vazgeç
					</button>
					<button
						type='button'
						onClick={handleSaveClick}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						Kaydet
					</button>
				</div>
			</div>
		</div>
	);
}
