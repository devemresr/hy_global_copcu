import { useState } from 'react';
import { useBayiler } from '../../hooks/api/endpoints/useBayiler';
import { AdminSummary } from './AdminCollapseHeading';
import { toast } from 'sonner';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { OrderPeriodPicker } from './OrderPeriodPicker';
import {
	orderFiltersSchema,
	type OrderFilters,
} from '../../schemas/order.schema';
import { formatOrderMoney } from '../../constants/orderReports.constant';

export function OrderHistoryFilters({
	value,
	onChange,
	context = 'orders',
}: {
	value: OrderFilters;
	onChange: (filters: OrderFilters) => void;
	context?: 'orders' | 'stock' | 'finance';
}) {
	const bayiler = useBayiler(context !== 'finance');
	const bayiNames = [
		...new Set([
			...(bayiler.data?.bayiler ?? []).map((bayi) => bayi.name),
			...(value.bayiName ? [value.bayiName] : []),
		]),
	].sort((a, b) => a.localeCompare(b, 'tr'));
	const [minTotal, setMinTotal] = useState<number | ''>(value.minTotal ?? '');
	const [maxTotal, setMaxTotal] = useState<number | ''>(value.maxTotal ?? '');
	const [bayiName, setBayiName] = useState(value.bayiName ?? '');
	const [syncedBayiName, setSyncedBayiName] = useState(value.bayiName);
	if (syncedBayiName !== value.bayiName) {
		setSyncedBayiName(value.bayiName);
		setBayiName(value.bayiName ?? '');
	}
	const [error, setError] = useState('');
	const bayiActive = Boolean(value.bayiName);
	const priceActive =
		value.minTotal !== undefined || value.maxTotal !== undefined;
	const dateActive = Boolean(value.from || value.until);
	const pendingPrices =
		(minTotal === '' ? undefined : minTotal) !== value.minTotal ||
		(maxTotal === '' ? undefined : maxTotal) !== value.maxTotal;
	function apply(period: OrderFilters = value) {
		const result = orderFiltersSchema.safeParse({
			...period,
			bayiName: bayiName.trim() || undefined,
			minTotal: minTotal === '' ? undefined : minTotal,
			maxTotal: maxTotal === '' ? undefined : maxTotal,
		});
		if (!result.success) {
			const message = result.error.issues[0].message;
			setError(message);
			toast.error('Filtreler uygulanamadı', { description: message });
			return;
		}
		setError('');
		onChange(
			Object.fromEntries(
				Object.entries(result.data).filter(([, entry]) => entry !== undefined),
			),
		);
	}
	return (
		<details
			open
			className={
				context !== 'orders'
					? 'min-w-0 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 sm:p-4'
					: 'min-w-0 rounded-xl border border-border p-3 sm:p-4'
			}
		>
			<AdminSummary index={2}>
				{context === 'finance'
					? 'Bakiye raporu filtreleri'
					: context === 'stock'
						? 'Stok ve satış raporu filtreleri'
						: 'Alış ve rapor filtreleri'}
			</AdminSummary>
			<form
				className='mt-3 min-w-0 space-y-3'
				onSubmit={(event) => {
					event.preventDefault();
					apply();
				}}
				aria-label={
					context === 'finance'
						? 'Bakiye raporu filtreleri'
						: context === 'stock'
							? 'Stok ve satış filtreleri'
							: 'Alış ve PDF filtreleri'
				}
			>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<span
						className={`rounded-md border border-border px-2 py-1 text-xs ${priceActive || dateActive || bayiActive ? 'bg-neutral-900 text-white dark:bg-black' : 'opacity-70'}`}
						role='status'
					>
						{priceActive || dateActive || bayiActive
							? `${Number(priceActive) + Number(dateActive) + Number(bayiActive)} filtre etkin`
							: context !== 'orders'
								? 'Filtre yok · Tüm kayıtlar'
								: 'Filtre yok · Tüm alışlar'}
					</span>
				</div>
				<p className='text-xs opacity-70'>
					{context === 'finance'
						? 'Tarih ve tutar, aşağıdaki gelir/gider ve alt tür filtreleriyle birlikte uygulanır.'
						: context === 'stock'
							? 'Bayi adı, tutar ve tarih stok girişlerini filtreler. Satış raporunda tarih ve tutar birlikte uygulanır.'
							: 'Bayi adı, fiyat ve tarih birlikte uygulanır. Sonuçlardan rapora dahil edilecek alışları seçebilirsiniz.'}
				</p>
				{context !== 'finance' && (
					<label
						className='flex w-full max-w-64 flex-col gap-1 text-sm'
						htmlFor='order-filter-bayi'
					>
						Bayi adı
						<select
							id='order-filter-bayi'
							value={bayiName}
							onChange={(event) => setBayiName(event.target.value)}
							className='h-9 min-w-0 rounded-lg border border-border bg-button-bg px-2 py-1 text-text'
						>
							<option value=''>Tüm bayiler</option>
							{bayiNames.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</label>
				)}
				{bayiler.isError && (
					<p role='alert' className='text-xs text-red-500'>
						Bayiler yüklenemedi.{' '}
						<button
							type='button'
							className='underline'
							onClick={() => void bayiler.refetch()}
						>
							Tekrar dene
						</button>
					</p>
				)}
				<div className='flex items-center justify-between text-sm'>
					<span className='font-medium'>Fiyat</span>
					<span className='text-xs opacity-70'>
						{priceActive ? 'Etkin' : 'Tüm tutarlar'}
					</span>
				</div>
				<div className='flex flex-wrap items-end gap-2'>
					{(
						[
							{
								key: 'minTotal',
								label: 'En az toplam (TL)',
								value: minTotal,
								change: setMinTotal,
							},
							{
								key: 'maxTotal',
								label: 'En çok toplam (TL)',
								value: maxTotal,
								change: setMaxTotal,
							},
						] as const
					).map((field) => (
						<div
							key={field.key}
							className='flex w-40 max-w-full flex-col gap-1 text-sm'
						>
							<label htmlFor={`order-filter-${field.key}`}>{field.label}</label>
							<NumberInputWithSteppers
								disableWheel
								id={`order-filter-${field.key}`}
								value={field.value}
								onChange={field.change}
								className='w-full min-w-0 rounded-lg border border-border bg-button-bg px-2 py-1.5 text-text [&_input]:w-12 [&_input]:min-w-0'
								stepperClassName='rounded px-1 py-1'
							/>
						</div>
					))}
					<button
						type='submit'
						className='rounded-lg border border-border bg-button-bg px-3 py-2 text-xs hover:bg-button-hover-bg'
					>
						Filtreleri uygula
					</button>
					<button
						type='button'
						className='rounded-lg border border-border bg-button-bg px-3 py-2 text-xs hover:bg-button-hover-bg'
						onClick={() => {
							setMinTotal('');
							setMaxTotal('');
							setBayiName('');
							setError('');
							onChange({});
						}}
					>
						Temizle
					</button>
				</div>
				{(pendingPrices || bayiName.trim() !== (value.bayiName ?? '')) && (
					<p className='text-xs opacity-70'>
						Filtre değişiklikleri henüz uygulanmadı.
					</p>
				)}
				<OrderPeriodPicker
					value={value}
					onChange={(range) => apply({ ...value, ...range })}
				/>
				{(priceActive || dateActive || bayiActive) && (
					<div
						className='flex flex-wrap gap-2 border-t border-border pt-3'
						aria-label='Etkin filtreler'
					>
						{bayiActive && (
							<button
								type='button'
								className='rounded-md border border-border bg-button-bg px-2 py-1 text-xs'
								aria-label='Bayi filtresini kaldır'
								onClick={() => {
									setBayiName('');
									const { bayiName: _bayi, ...rest } = value;
									onChange(rest);
								}}
							>
								Bayi: {value.bayiName} ×
							</button>
						)}
						{priceActive && (
							<button
								type='button'
								className='rounded-md border border-border bg-button-bg px-2 py-1 text-xs'
								aria-label='Fiyat filtresini kaldır'
								onClick={() => {
									setMinTotal('');
									setMaxTotal('');
									setError('');
									const { minTotal: _min, maxTotal: _max, ...rest } = value;
									onChange(rest);
								}}
							>
								Fiyat:{' '}
								{value.minTotal === undefined
									? 'Alt sınır yok'
									: formatOrderMoney(value.minTotal)}{' '}
								–{' '}
								{value.maxTotal === undefined
									? 'Üst sınır yok'
									: formatOrderMoney(value.maxTotal)}{' '}
								×
							</button>
						)}
						{dateActive && (
							<button
								type='button'
								className='rounded-md border border-border bg-button-bg px-2 py-1 text-xs'
								aria-label='Tarih filtresini kaldır'
								onClick={() => {
									const { from: _from, until: _until, ...rest } = value;
									onChange(rest);
								}}
							>
								Tarih: {value.from ?? 'Başlangıç yok'} –{' '}
								{value.until ?? 'Bitiş yok'} ×
							</button>
						)}
					</div>
				)}
				{error && (
					<p role='alert' className='text-sm text-red-500'>
						{error}
					</p>
				)}
			</form>
		</details>
	);
}
