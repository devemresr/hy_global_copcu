import {
	ORDER_MEMORY_SIZES,
	ORDER_PRODUCT_TYPE_ORDER,
	ORDER_PRODUCT_TYPES,
} from '../../constants/orderProducts.constant';
import { ORDER_PERIOD_PRESETS } from '../../constants/orderReports.constant';
import { orderPresetRange } from '../../helpers/orderPeriod.helper';
import { toast } from 'sonner';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useBayiler } from '../../hooks/api/endpoints/useBayiler';
import { AdminSummary } from './AdminCollapseHeading';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { OrderPeriodPicker } from './OrderPeriodPicker';
import {
	orderFiltersSchema,
	type OrderFilters,
} from '../../schemas/order.schema';
import {
	NUMERIC_FIELDS,
	numericFieldsFor,
	numericFilterLabel,
	type NumericField,
} from '../../helpers/numericFilters.helper';
import { Trash2, Plus, ListFilter } from 'lucide-react';

type Draft = {
	field: NumericField;
	min: number | '';
	max: number | '';
	productType?: 'EMMC' | 'EMCP' | 'IPHONE' | 'TABLET';
	memoryGb?: number;
};
const recordFields = [
	'total',
	'recordPiece',
	'recordKg',
	'recordG',
	'lineCount',
];
const control =
	'h-9 min-w-0 max-w-full rounded-lg border border-border bg-button-bg px-2 text-sm text-text';
function numericRows(value: OrderFilters): Draft[] {
	const rows: Draft[] = (value.numericFilters ?? []).map((f) => ({
		field: f.field,
		productType: f.productType,
		memoryGb: f.memoryGb,
		min: f.min ?? '',
		max: f.max ?? '',
	}));
	if (value.minTotal !== undefined || value.maxTotal !== undefined)
		rows.unshift({
			field: 'total',
			min: value.minTotal ?? '',
			max: value.maxTotal ?? '',
		});
	return rows.length ? rows : [{ field: 'total', min: '', max: '' }];
}
export function OrderHistoryFilters({
	value,
	onChange,
	context = 'orders',
	children,
	categoryName,
}: {
	value: OrderFilters;
	onChange: (filters: OrderFilters) => void;
	context?: 'orders' | 'stock' | 'finance';
	children?: ReactNode;
	categoryName?: string;
}) {
	const id = useId();
	const panel = useRef<HTMLDetailsElement>(null);
	const bayiler = useBayiler(context !== 'finance');
	const names = [
		...new Set([
			...(bayiler.data?.bayiler ?? []).map((b) => b.name),
			...(value.bayiName ? [value.bayiName] : []),
		]),
	].sort((a, b) => a.localeCompare(b, 'tr'));
	const [rows, setRows] = useState<Draft[]>(() => numericRows(value));
	const [bayiName, setBayiName] = useState(value.bayiName ?? '');
	const [synced, setSynced] = useState(value);
	const [error, setError] = useState('');
	if (
		JSON.stringify([
			synced.bayiName,
			synced.numericFilters,
			synced.minTotal,
			synced.maxTotal,
		]) !==
		JSON.stringify([
			value.bayiName,
			value.numericFilters,
			value.minTotal,
			value.maxTotal,
		])
	) {
		setSynced(value);
		setRows(numericRows(value));
		setBayiName(value.bayiName ?? '');
	}
	const pending =
		bayiName.trim() !== (value.bayiName ?? '') ||
		JSON.stringify(rows.filter((r) => r.min !== '' || r.max !== '')) !==
			JSON.stringify(
				numericRows(value).filter((r) => r.min !== '' || r.max !== ''),
			);
	const active: string[] = [];
	if (value.bayiName) active.push('Bayi: ' + value.bayiName);
	if (value.from || value.until) {
		const preset = ORDER_PERIOD_PRESETS.find((p) => {
			const range = orderPresetRange(p.id);
			return range.from === value.from && range.until === value.until;
		});
		active.push(
			'Dönem: ' +
				(preset?.label ?? 'Özel aralık') +
				' · ' +
				(value.from ?? 'Başlangıç yok') +
				' – ' +
				(value.until ?? 'Bitiş yok'),
		);
	}
	if (value.minTotal !== undefined || value.maxTotal !== undefined)
		active.push(
			numericFilterLabel({
				field: 'total',
				min: value.minTotal,
				max: value.maxTotal,
			}),
		);
	active.push(...(value.numericFilters ?? []).map(numericFilterLabel));
	const extra = value as OrderFilters & Record<string, unknown>;
	const movementLabels: Record<string, string> = {
		purchase: 'Alış',
		restock: 'Satış',
		complete: 'Tüm stok satışı',
		partial: 'Kısmi satış',
	};
	if (extra.movementType && extra.movementType !== 'all')
		active.push(
			'Hareket: ' +
				(movementLabels[String(extra.movementType)] ??
					String(extra.movementType)),
		);
	if (extra.productType)
		active.push(
			'Ürün: ' +
				(ORDER_PRODUCT_TYPES[
					extra.productType as keyof typeof ORDER_PRODUCT_TYPES
				]?.label ?? String(extra.productType)),
		);
	if (extra.memoryGb) active.push('Bellek: ' + String(extra.memoryGb) + ' GB');
	const groupLabels: Record<string, string> = {
		purchase: 'Mal alış',
		other: 'Diğer gider',
		sale: 'Satış',
		investment: 'Yatırım',
	};
	if (extra.group)
		active.push(
			'Ana tür: ' + (groupLabels[String(extra.group)] ?? String(extra.group)),
		);
	if (extra.direction)
		active.push(extra.direction === 'income' ? 'Gelir' : 'Gider');
	if (extra.categoryId)
		active.push('Alt tür: ' + (categoryName ?? 'Seçili alt tür'));
	function apply(period: OrderFilters = value) {
		const numericFilters = rows
			.filter((r) => r.min !== '' || r.max !== '')
			.map((r) => ({
				field: r.field,
				productType: r.productType,
				memoryGb: r.memoryGb,
				min: r.min === '' ? undefined : r.min,
				max: r.max === '' ? undefined : r.max,
			}));
		const totalIndex = numericFilters.findIndex((f) => f.field === 'total');
		const total = numericFilters[totalIndex];
		const others = numericFilters.filter((_, i) => i !== totalIndex);
		const parsed = orderFiltersSchema.safeParse({
			...period,
			bayiName:
				context === 'finance' ? undefined : bayiName.trim() || undefined,
			minTotal: total?.min,
			maxTotal: total?.max,
			numericFilters: others.length ? others : undefined,
		});
		if (!parsed.success) {
			const message = parsed.error.issues[0].message;
			setError(message);
			toast.error('Filtreler uygulanamadı', { description: message });
			return;
		}
		setError('');
		onChange(
			Object.fromEntries(
				Object.entries(parsed.data).filter(([, v]) => v !== undefined),
			),
		);
	}
	function update(index: number, patch: Partial<Draft>) {
		setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
	}
	return (
		<div className='min-w-0 space-y-3'>
			<details
				ref={panel}
				id={id}
				open
				className='min-w-0 scroll-mt-20 rounded-xl border-2 border-sky-500/40 bg-sky-500/10 p-3 sm:p-4'
			>
				<AdminSummary index={2}>
					{context === 'finance'
						? 'Bakiye raporu filtreleri'
						: context === 'stock'
							? 'Stok ve satış raporu filtreleri'
							: 'Alış ve rapor filtreleri'}
				</AdminSummary>
				<p className='mt-3 flex items-start gap-2 text-sm font-medium'>
					<ListFilter size={18} className='mt-0.5 shrink-0' />
					Bu filtreler aşağıdaki liste, toplamlar ve rapor verilerinin tamamını
					değiştirir.
				</p>
				<p className='mt-1 text-xs opacity-75'>
					{context === 'stock'
						? 'Mevcut envanter bu raporun dışındadır. Bayi seçimi yalnızca alış girişlerini gösterir.'
						: context === 'finance'
							? 'Genel bakiye tüm hareketleri kapsar; dönem özeti ve hareket listesi filtrelenir.'
							: 'Her seçili ürün kendi koşullarını aynı satırda karşılamalıdır. Belirtilen ürünlerin tümünü içeren alışlar rapora alınır.'}
				</p>
				<form
					className='mt-3 space-y-3'
					aria-label={
						context === 'finance'
							? 'Bakiye raporu filtreleri'
							: context === 'stock'
								? 'Stok ve satış filtreleri'
								: 'Alış ve PDF filtreleri'
					}
					onSubmit={(e) => {
						e.preventDefault();
						apply();
					}}
				>
					{context !== 'finance' && (
						<label
							className='flex w-full max-w-64 flex-col gap-1 text-sm'
							htmlFor={id + '-bayi'}
						>
							Bayi adı
							<select
								id={id + '-bayi'}
								className={control}
								value={bayiName}
								onChange={(e) => setBayiName(e.target.value)}
							>
								<option value=''>Tüm bayiler</option>
								{names.map((name) => (
									<option key={name}>{name}</option>
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
					<fieldset className='space-y-2'>
						<legend className='mb-2 text-sm font-medium'>
							İşlem ve ürün koşulları
						</legend>
						<p className='text-xs opacity-70'>
							Önce kapsamı, sonra özelliği seçin. Aynı ürünün koşulları birlikte
							uygulanır; stok raporunda farklı ürün kapsamlarından birine uyan
							satırlar gösterilir. Sınırlar dahildir, boş sınırlar uygulanmaz.
						</p>
						{rows.map((row, index) => (
							<div
								key={index}
								className='flex min-w-0 flex-wrap items-end gap-2'
							>
								<label className='flex max-w-full flex-col gap-1 text-xs'>
									Kapsam
									<select
										disabled={context === 'finance'}
										aria-label={index + 1 + '. koşul ürünü'}
										className={control + ' w-40'}
										value={
											row.productType ??
											(recordFields.includes(row.field) ? 'operation' : 'all')
										}
										onChange={(e) => {
											const scope = e.target.value;
											update(index, {
												productType:
													scope === 'all' || scope === 'operation'
														? undefined
														: (scope as Draft['productType']),
												memoryGb: undefined,
												field:
													scope === 'operation'
														? 'total'
														: recordFields.includes(row.field)
															? 'lineTotal'
															: row.field,
											});
										}}
									>
										<option value='operation'>İşlem geneli</option>
										{context !== 'finance' && (
											<option value='all'>Tüm ürünler</option>
										)}
										{(context === 'finance'
											? []
											: ORDER_PRODUCT_TYPE_ORDER
										).map((type) => (
											<option key={type} value={type}>
												{ORDER_PRODUCT_TYPES[type].label}
											</option>
										))}
									</select>
								</label>
								{(row.productType === 'EMMC' || row.productType === 'EMCP') && (
									<label className='flex flex-col gap-1 text-xs'>
										Bellek
										<select
											aria-label={index + 1 + '. koşul bellek boyutu'}
											className={control + ' w-28'}
											value={row.memoryGb ?? ''}
											onChange={(e) =>
												update(index, {
													memoryGb: e.target.value
														? Number(e.target.value)
														: undefined,
												})
											}
										>
											<option value=''>Tüm boyutlar</option>
											{ORDER_MEMORY_SIZES.map((size) => (
												<option key={size} value={size}>
													{size} GB
												</option>
											))}
										</select>
									</label>
								)}
								<label
									className='flex max-w-full flex-col gap-1 text-xs'
									htmlFor={id + '-field-' + index}
								>
									Alan
									<select
										id={id + '-field-' + index}
										className={control + ' w-56'}
										value={row.field}
										onChange={(e) =>
											update(index, { field: e.target.value as NumericField })
										}
									>
										{numericFieldsFor(context)
											.filter((field) =>
												recordFields.includes(row.field) && !row.productType
													? recordFields.includes(field)
													: !recordFields.includes(field),
											)
											.filter(
												(field) =>
													field !== 'memoryGb' ||
													!row.productType ||
													row.productType === 'EMMC' ||
													row.productType === 'EMCP',
											)
											.map((field) => (
												<option key={field} value={field}>
													{NUMERIC_FIELDS[field]}
												</option>
											))}
									</select>
								</label>
								{(['min', 'max'] as const).map((bound) => (
									<label
										key={bound}
										className='flex w-36 max-w-full flex-col gap-1 text-xs'
										htmlFor={id + '-' + bound + '-' + index}
									>
										{row.field === 'total'
											? bound === 'min'
												? 'En az toplam (TL)'
												: 'En çok toplam (TL)'
											: bound === 'min'
												? 'En az'
												: 'En çok'}
										<NumberInputWithSteppers
											id={id + '-' + bound + '-' + index}
											disableWheel
											decimalPlaces={6}
											allowNegative={
												row.field === 'profit' ||
												row.field === 'margin' ||
												row.field.startsWith('priceAdjustment') ||
												row.field === 'totalAdjustment'
											}
											value={row[bound]}
											onChange={(v) =>
												update(index, {
													[bound]: typeof v === 'function' ? v(row[bound]) : v,
												})
											}
											className={
												control + ' w-full [&_input]:w-12 [&_input]:min-w-0'
											}
											stepperClassName='rounded px-1 py-1'
										/>
									</label>
								))}
								<button
									type='button'
									className={control}
									aria-label={'Sayı filtresini kaldır ' + (index + 1)}
									onClick={() => setRows(rows.filter((_, i) => i !== index))}
								>
									<Trash2 size={16} />
								</button>
							</div>
						))}
						<button
							type='button'
							disabled={rows.length >= 30}
							className={control + ' inline-flex items-center gap-1 text-xs'}
							onClick={() =>
								setRows([...rows, { field: 'total', min: '', max: '' }])
							}
						>
							<Plus size={14} />
							Koşul ekle
						</button>
					</fieldset>
					<div className='flex flex-wrap gap-2'>
						<button type='submit' className={control}>
							Filtreleri uygula
						</button>
						<button
							type='button'
							className={control}
							onClick={() => {
								setRows([{ field: 'total', min: '', max: '' }]);
								setBayiName('');
								setError('');
								onChange({});
							}}
						>
							Temizle
						</button>
					</div>
					{pending && (
						<p className='text-xs font-medium text-amber-700 dark:text-amber-300'>
							Filtre değişiklikleri henüz uygulanmadı.
						</p>
					)}
					<OrderPeriodPicker
						value={value}
						onChange={(range) => apply({ ...value, ...range })}
					/>
					{error && (
						<p role='alert' className='text-sm text-red-500'>
							{error}
						</p>
					)}
				</form>
				{children && (
					<div className='mt-3 space-y-3 border-t border-border pt-3'>
						{children}
					</div>
				)}
			</details>
			<div
				role='status'
				className={
					'rounded-lg border p-3 text-sm ' +
					(active.length
						? 'border-amber-500/40 bg-amber-500/10'
						: 'border-sky-500/30 bg-sky-500/5')
				}
			>
				<p className='font-medium'>
					{active.length
						? 'Dikkat: aşağıdaki veriler ' +
							active.length +
							' filtre ile sınırlandırıldı.'
						: 'Aşağıdaki veriler tüm kayıtları kapsar; etkin filtre yok.'}
				</p>
				{active.length > 0 && (
					<ul className='mt-2 flex flex-wrap gap-2 text-xs'>
						{active.map((label, i) => (
							<li
								key={i}
								className='max-w-full rounded-full border border-amber-500/40 bg-button-bg px-3 py-1.5 font-medium'
							>
								{label}
							</li>
						))}
					</ul>
				)}
				<a
					className='mt-2 inline-block font-medium underline underline-offset-2'
					href={'#' + id}
					onClick={(e) => {
						e.preventDefault();
						if (panel.current) {
							panel.current.open = true;
							panel.current.scrollIntoView({
								behavior: 'smooth',
								block: 'start',
							});
							panel.current
								.querySelector('summary')
								?.focus({ preventScroll: true });
						}
					}}
				>
					Filtrelere git
				</a>
			</div>
		</div>
	);
}
