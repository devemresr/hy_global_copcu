import { useEffect, useState } from 'react';
import type { EditableInventoryItem } from '../../types';
import { editableInventoryItemSchema } from '../../schemas/item.schema';
import { CURRENCY_OPTIONS } from '../../constants/currency.constant';
import { STORAGE_UNIT_OPTIONS } from '../../constants/storageUnit.constant';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';
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
};

export function ItemEditModal({
	item,
	onClose,
	onSave,
	isSaving = false,
	enterEnabled,
	escapeEnabled,
}: ItemEditModalProps) {
	const [model, setModel] = useState(item.model);
	const [bellekTipi, setBellekTipi] = useState(item.bellekTipi ?? '');
	const [depolamaInput, setDepolamaInput] = useState(String(item.depolama ?? ''));
	const [depolamaBirimi, setDepolamaBirimi] = useState(item.depolamaBirimi);
	const [ram, setRam] = useState(item.ram ?? '');
	const [fiyatInput, setFiyatInput] = useState(String(item.fiyat ?? ''));
	const [paraBirimi, setParaBirimi] = useState(item.paraBirimi);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setModel(item.model);
		setBellekTipi(item.bellekTipi ?? '');
		setDepolamaInput(String(item.depolama ?? ''));
		setDepolamaBirimi(item.depolamaBirimi);
		setRam(item.ram ?? '');
		setFiyatInput(String(item.fiyat ?? ''));
		setParaBirimi(item.paraBirimi);
		setError(null);
	}, [item]);

	function handleSave() {
		if (isSaving) return;
		const trimmedFiyat = fiyatInput.trim();
		const trimmedDepolama = depolamaInput.trim();
		const result = editableInventoryItemSchema.safeParse({
			model: model.trim(),
			bellekTipi: bellekTipi.trim() || null,
			depolama: trimmedDepolama === '' ? null : Number(trimmedDepolama),
			depolamaBirimi,
			ram: ram.trim() || null,
			fiyat: trimmedFiyat === '' ? null : Number(trimmedFiyat),
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
					<span className='text-sm font-semibold'>Ürünü Düzenle</span>
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
							<input
								type='number'
								min={0}
								step='0.01'
								inputMode='decimal'
								value={depolamaInput}
								onChange={(e) => {
									setDepolamaInput(e.target.value);
									setError(null);
								}}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
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
							<input
								type='number'
								min={0}
								step='0.01'
								inputMode='decimal'
								value={fiyatInput}
								onChange={(e) => {
									setFiyatInput(e.target.value);
									setError(null);
								}}
								className='rounded-xl bg-button-bg px-2 py-1.5 outline-none focus:bg-button-focus-bg'
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
						{isSaving ? 'Kaydediliyor...' : 'Kaydet'}
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
