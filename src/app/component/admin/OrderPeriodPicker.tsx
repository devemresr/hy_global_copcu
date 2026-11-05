import { AdminSummary } from './AdminCollapseHeading';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import {
	ORDER_MONTH_NAMES,
	ORDER_PERIOD_PRESETS,
} from '../../constants/orderReports.constant';
import {
	istanbulToday,
	orderLastDaysRange,
	orderRangeLabel,
	orderMonthRange,
	orderPresetRange,
	type OrderDateRange,
} from '../../helpers/orderPeriod.helper';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import {
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { orderFiltersSchema } from '../../schemas/order.schema';

const control =
	'h-9 rounded-lg border border-border bg-button-bg px-2 py-1 text-sm text-text';
const button =
	'h-9 min-w-0 max-w-full rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 sm:px-2.5 sm:py-1 sm:text-xs';
const selectionStyle = (selected: boolean) =>
	selected
		? 'border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-500 dark:bg-black dark:hover:bg-neutral-950'
		: 'border-border bg-button-bg text-text hover:bg-button-hover-bg';
function selectedMonth(value: { from?: string; until?: string }) {
	const start = value.from ?? istanbulToday();
	const month = Number(start.slice(5, 7)) - 1;
	const range = orderMonthRange(Number(start.slice(0, 4)), month);
	return value.from === range.from && value.until === range.until ? month : '';
}
export function OrderPeriodPicker({
	value,
	onChange,
}: {
	value: { from?: string; until?: string };
	onChange: (range: Partial<OrderDateRange>) => void;
}) {
	const id = useId();
	const [year, setYear] = useState<number>(
		Number((value.from ?? istanbulToday()).slice(0, 4)),
	);
	const [month, setMonth] = useState<number | ''>(() => selectedMonth(value));
	const [mode, setMode] = useState<'day' | 'range'>('day');
	const [from, setFrom] = useState(value.from ?? istanbulToday());
	const [until, setUntil] = useState(
		value.until ?? value.from ?? istanbulToday(),
	);
	const [error, setError] = useState('');
	const [presetId, setPresetId] = useState<string | null>(null);
	const [lastDays, setLastDays] = useState<number | ''>(7);
	const [syncedRange, setSyncedRange] = useState(value);
	const selectedPreset = ORDER_PERIOD_PRESETS.find((preset) => {
		const range = orderPresetRange(preset.id);
		return (
			preset.id === presetId &&
			value.from === range.from &&
			value.until === range.until
		);
	});
	if (syncedRange.from !== value.from || syncedRange.until !== value.until) {
		setSyncedRange(value);
		const start = value.from ?? istanbulToday();
		setFrom(start);
		setUntil(value.until ?? start);
		setYear(Number(start.slice(0, 4)));
		setMonth(selectedMonth(value));
	}
	function choose(range: OrderDateRange) {
		const parsed = orderFiltersSchema.safeParse(range);
		if (!parsed.success) {
			const message = 'Geçerli bir tarih aralığı seçin.';
			setError(message);
			toast.error(message);
			return;
		}
		setPresetId(null);
		setError('');
		setFrom(range.from);
		setUntil(range.until);
		setYear(Number(range.from.slice(0, 4)));
		onChange(range);
	}
	const currentYear = Number(istanbulToday().slice(0, 4));
	const years = [
		...new Set([
			year,
			...Array.from(
				{ length: currentYear - 2000 + 2 },
				(_, index) => currentYear + 1 - index,
			),
		]),
	].sort((a, b) => b - a);
	return (
		<div className='w-full min-w-0 max-w-full space-y-3 border-t border-border pt-3 sm:space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
				<span className='font-medium'>Tarih</span>
				<span className='text-xs opacity-70'>
					{value.from || value.until ? 'Etkin' : 'Tüm tarihler'}
				</span>
			</div>
			<div
				className='flex min-w-0 flex-wrap gap-1.5 sm:gap-2'
				aria-label='Hızlı dönemler'
			>
				{ORDER_PERIOD_PRESETS.map((preset) => {
					const range = orderPresetRange(preset.id);
					const selected = selectedPreset?.id === preset.id;
					return (
						<button
							key={preset.id}
							type='button'
							className={`${button} h-auto min-h-9 ${selectionStyle(selected)}`}
							aria-label={preset.label}
							aria-pressed={selected}
							onClick={() => {
								setError('');
								if (selected) {
									setPresetId(null);
									onChange({ from: undefined, until: undefined });
								} else {
									setPresetId(preset.id);
									onChange(range);
								}
							}}
						>
							<span className='block'>
								{preset.label}
								{selected ? ' ×' : ''}
							</span>
							<span className='block text-[10px] opacity-75'>
								{orderRangeLabel(range)}
							</span>
						</button>
					);
				})}
			</div>
			<div className='flex flex-wrap items-end gap-2'>
				<label className='space-y-1 text-xs' htmlFor={`${id}-last-days`}>
					Son X gün
					<NumberInputWithSteppers
						id={`${id}-last-days`}
						ariaLabel='Son X gün'
						disableWheel
						value={lastDays}
						onChange={setLastDays}
						className={STOCK_NUMBER_CONTROL}
						stepperClassName={STOCK_STEPPER}
					/>
				</label>
				<button
					type='button'
					className={`${button} ${selectionStyle(false)}`}
					onClick={() => {
						try {
							choose(orderLastDaysRange(Number(lastDays)));
						} catch (failure) {
							setError((failure as Error).message);
						}
					}}
				>
					Son günleri uygula
				</button>
			</div>
			{!selectedPreset && (
				<>
					<div className='flex min-w-0 flex-wrap gap-3'>
						<label
							className='flex w-24 min-w-0 flex-col gap-1 text-sm'
							htmlFor={`${id}-year`}
						>
							Yıl
							<select
								id={`${id}-year`}
								className={`${control} w-full min-w-0`}
								value={year}
								onChange={(event) => {
									const next = Number(event.target.value);
									setYear(next);
									if (month !== '') choose(orderMonthRange(next, month));
								}}
							>
								{years.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</label>
						<label
							className='flex w-32 min-w-0 flex-col gap-1 text-sm'
							htmlFor={`${id}-month`}
						>
							Ay
							<select
								id={`${id}-month`}
								className={`${control} w-full min-w-0`}
								value={month}
								onChange={(event) => {
									const next = Number(event.target.value);
									setMonth(next);
									choose(orderMonthRange(year, next));
								}}
							>
								<option value='' disabled>
									Ay seçin
								</option>
								{ORDER_MONTH_NAMES.map((name, index) => (
									<option key={name} value={index}>
										{name}
									</option>
								))}
							</select>
						</label>
					</div>
					<details className='min-w-0 max-w-full'>
						<AdminSummary index={0}>Tarih seç / Özel aralık</AdminSummary>
						<div className='mt-3 grid min-w-0 grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end'>
							<div className='grid min-w-0 grid-cols-2 gap-2 sm:flex'>
								<button
									type='button'
									className={`${button} ${selectionStyle(mode === 'day')}`}
									aria-pressed={mode === 'day'}
									onClick={() => setMode('day')}
								>
									Tek gün
								</button>
								<button
									type='button'
									className={`${button} ${selectionStyle(mode === 'range')}`}
									aria-pressed={mode === 'range'}
									onClick={() => setMode('range')}
								>
									Tarih aralığı
								</button>
							</div>
							<label className='flex min-w-0 flex-col gap-1 text-sm'>
								Başlangıç
								<input
									className={`${control} w-full min-w-0 max-w-full sm:w-40`}
									type='date'
									value={from}
									onChange={(e) => setFrom(e.target.value)}
								/>
							</label>
							{mode === 'range' && (
								<label className='flex min-w-0 flex-col gap-1 text-sm'>
									Bitiş
									<input
										className={`${control} w-full min-w-0 max-w-full sm:w-40`}
										type='date'
										value={until}
										onChange={(e) => setUntil(e.target.value)}
									/>
								</label>
							)}
							<button
								type='button'
								className={`${button} ${selectionStyle(false)}`}
								onClick={() =>
									choose({ from, until: mode === 'day' ? from : until })
								}
							>
								Dönemi uygula
							</button>
						</div>
					</details>
				</>
			)}
			{selectedPreset && (
				<p className='text-xs opacity-70'>
					{selectedPreset.label} etkin. Tarih seçeneklerini açmak için aynı
					düğmeye tekrar basın.
				</p>
			)}
			<p className='min-w-0 break-words text-xs opacity-70' aria-live='polite'>
				{value.from ?? 'Başlangıç sınırı yok'} –{' '}
				{value.until ?? 'Bitiş sınırı yok'} · İstanbul saati
			</p>
			{error && (
				<p role='alert' className='text-sm text-red-500'>
					{error}
				</p>
			)}
		</div>
	);
}
