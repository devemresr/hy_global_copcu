import { useEffect, useState } from 'react';
import type { EditableInventoryItem } from '../../types';
import { CURRENCY_OPTIONS } from '../../constants/currency.constant';
import CancelIcon from '../../assets/icons/icons8-cancel.svg?react';

type ItemEditModalProps = {
	item: EditableInventoryItem;
	onClose: () => void;
	// Caller decides what "save" means; this only validates the fields below.
	onSave: (updated: EditableInventoryItem) => void;
};

export function ItemEditModal({ item, onClose, onSave }: ItemEditModalProps) {
	const [model, setModel] = useState(item.Model);
	const [bellekTipi, setBellekTipi] = useState(item.BellekTipi ?? '');
	const [depoloma, setDepoloma] = useState(item.Depoloma ?? '');
	const [ram, setRam] = useState(item.ram ?? '');
	const [fiyatInput, setFiyatInput] = useState(String(item.Fiyat ?? ''));
	const [currency, setCurrency] = useState(item.Currency);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setModel(item.Model);
		setBellekTipi(item.BellekTipi ?? '');
		setDepoloma(item.Depoloma ?? '');
		setRam(item.ram ?? '');
		setFiyatInput(String(item.Fiyat ?? ''));
		setCurrency(item.Currency);
		setError(null);
	}, [item]);

	function handleSave() {
		const trimmedModel = model.trim();
		if (!trimmedModel) {
			setError('Model boş olamaz');
			return;
		}

		const trimmedFiyat = fiyatInput.trim();
		const parsedFiyat = trimmedFiyat === '' ? null : Number(trimmedFiyat);
		if (
			parsedFiyat !== null &&
			(Number.isNaN(parsedFiyat) || parsedFiyat < 0)
		) {
			setError('Geçerli bir fiyat girin');
			return;
		}

		onSave({
			Model: trimmedModel,
			BellekTipi: bellekTipi.trim() || null,
			Depoloma: depoloma.trim() || null,
			ram: ram.trim() || null,
			Fiyat: parsedFiyat,
			Currency: currency,
		});
	}

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
					<TextField
						label='Depoloma'
						value={depoloma}
						onChange={setDepoloma}
					/>
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
								value={currency}
								onChange={(e) =>
									setCurrency(e.target.value as typeof currency)
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
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						Kaydet
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
