import { useEffect, useState } from 'react';
import type { EditableInventoryItem } from '../../types';
import { editableInventoryItemSchema } from '../../schemas/item.schema';
import { CURRENCY_OPTIONS } from '../../constants/currency.constant';
import { STORAGE_UNIT_OPTIONS } from '../../constants/storageUnit.constant';
import { fieldMeta } from '../../constants/fieldRegistry.constant';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import CancelIcon from '../../assets/icons/icons8-cancel.svg?react';

type ItemEditModalProps = {
	item: EditableInventoryItem;
	onClose: () => void;
	// Caller decides what "save" means; this only validates the fields below.
	onSave: (updated: EditableInventoryItem) => void;
	// The modal stays mounted until onSave's mutation resolves (Admin.tsx only
	// closes it on success), so Kaydet needs its own disabled state - unlike
	// FieldEditModal/ConfirmDialog, which close as soon as they call their own
	// mutation, before a second click is even possible.
	isSaving?: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	// Only changes the title/submit copy - editing and creating validate and
	// submit through the exact same path below.
	mode?: 'edit' | 'create';
};

export function ItemEditModal({
	item,
	onClose,
	onSave,
	isSaving = false,
	enterEnabled,
	escapeEnabled,
	mode = 'edit',
}: ItemEditModalProps) {
	const [model, setModel] = useState(item.model);
	const [bellekTipi, setBellekTipi] = useState(item.bellekTipi ?? '');
	const [depolama, setDepolama] = useState<number | ''>(item.depolama ?? '');
	const [depolamaBirimi, setDepolamaBirimi] = useState(item.depolamaBirimi);
	const [ram, setRam] = useState(item.ram ?? '');
	const [fiyat, setFiyat] = useState<number | ''>(item.fiyat ?? '');
	const [paraBirimi, setParaBirimi] = useState(item.paraBirimi);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setModel(item.model);
		setBellekTipi(item.bellekTipi ?? '');
		setDepolama(item.depolama ?? '');
		setDepolamaBirimi(item.depolamaBirimi);
		setRam(item.ram ?? '');
		setFiyat(item.fiyat ?? '');
		setParaBirimi(item.paraBirimi);
		setError(null);
	}, [item]);

	function handleSave() {
		if (isSaving) return;
		const result = editableInventoryItemSchema.safeParse({
			model: model.trim(),
			bellekTipi: bellekTipi.trim() || null,
			depolama: depolama === '' ? null : depolama,
			depolamaBirimi,
			ram: ram.trim() || null,
			fiyat: fiyat === '' ? null : fiyat,
			paraBirimi,
		});

		if (!result.success) {
			setError(result.error.issues[0].message);
			return;
		}

		setError(null);
		onSave(result.data);
	}

	useModalHotkeys(handleSave, onClose, { enterEnabled, escapeEnabled });

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
			onClick={onClose}
		>
			<div
				className='w-full max-w-md bg-modal-bg text-text rounded-xl p-4'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex items-center justify-between mb-4'>
					<span className='text-sm font-semibold'>
						{mode === 'create' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}
					</span>
					<button
						type='button'
						className='h-7 w-7 shrink-0'
						onClick={onClose}
						aria-label='Kapat'
					>
						<CancelIcon className='w-full h-full icon' />
					</button>
				</div>

				<div className='flex flex-col gap-3 text-sm'>
					<TextField label='Model' value={model} onChange={setModel} />
					<TextField
						label='Bellek Türü'
						value={bellekTipi}
						onChange={setBellekTipi}
					/>
					<div className='flex gap-2'>
						<label className='flex-1 flex flex-col gap-1'>
							<span className='opacity-70'>Depoloma</span>
							<NumberInputWithSteppers
								id='depolama-input'
								value={depolama}
								steppers={fieldMeta('depolama').stepperValues}
								onChange={(update) => {
									setDepolama(update);
									setError(null);
								}}
							/>
						</label>

						<label className='flex flex-col gap-1'>
							<span className='opacity-70'>Birim</span>
							<select
								value={depolamaBirimi}
								onChange={(e) =>
									setDepolamaBirimi(e.target.value as typeof depolamaBirimi)
								}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
							>
								{STORAGE_UNIT_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</label>
					</div>

					<TextField label='RAM' value={ram} onChange={setRam} />

					<div className='flex gap-2'>
						<label className='flex-1 flex flex-col gap-1'>
							<span className='opacity-70'>Fiyat</span>
							<NumberInputWithSteppers
								id='fiyat-input'
								value={fiyat}
								steppers={fieldMeta('fiyat').stepperValues}
								onChange={(update) => {
									setFiyat(update);
									setError(null);
								}}
							/>
						</label>

						<label className='flex flex-col gap-1'>
							<span className='opacity-70'>Para Birimi</span>
							<select
								value={paraBirimi}
								onChange={(e) =>
									setParaBirimi(e.target.value as typeof paraBirimi)
								}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
							>
								{CURRENCY_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</label>
					</div>

					{error && <p className='text-red-500'>{error}</p>}
				</div>

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
						onClick={handleSave}
						disabled={isSaving}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg disabled:opacity-40'
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

function TextField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className='flex flex-col gap-1'>
			<span className='opacity-70'>{label}</span>
			<input
				type='text'
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
			/>
		</label>
	);
}
