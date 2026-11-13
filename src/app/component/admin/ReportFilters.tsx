import { BayiPicker } from './BayiPicker';
import { purchaseChoices } from '../../helpers/purchaseChoices.helper';
import { formatPurchaseProduct } from '../../helpers/purchaseProduct.helper';
import { useInvestors } from '../../hooks/api/endpoints/useInvestors';
import type { ReportKind } from '../../constants/reportKinds.constant';
import { PURCHASE_PRODUCT_TYPES } from '../../constants/purchaseProducts.constant';
import { PURCHASE_PERIOD_PRESETS } from '../../constants/purchaseReports.constant';
import { purchasePresetRange } from '../../helpers/purchasePeriod.helper';
import { toast } from 'sonner';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useBayiler } from '../../hooks/api/endpoints/useBayiler';
import { AdminSummary } from './AdminCollapseHeading';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { PurchasePeriodPicker } from './PurchasePeriodPicker';
import {
	purchaseFiltersSchema,
	type PurchaseFilters,
} from '../../schemas/purchase.schema';
import {
	NUMERIC_FIELDS,
	numericFieldsFor,
	numericFilterLabel,
	type NumericField,
} from '../../helpers/numericFilters.helper';
import { Trash2, Plus, ListFilter, X } from 'lucide-react';

type Draft = {
	kind?: 'bayi';
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
function numericRows(value: PurchaseFilters): Draft[] {
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
	if (value.bayiIds?.length || value.bayiId)
		rows.unshift({ kind: 'bayi', field: 'total', min: '', max: '' });
	return rows.length
		? rows
		: [{ kind: 'bayi', field: 'total', min: '', max: '' }];
}
export function ReportFilters<T extends PurchaseFilters = PurchaseFilters>({
	value,
	onChange,
	reportKind = 'purchase',
	children,
	categoryName,
}: {
	value: T;
	onChange: (filters: T) => void;
	reportKind?: ReportKind;
	children?: ReactNode;
	categoryName?: string;
}) {
	const id = useId();
	const panel = useRef<HTMLDetailsElement>(null);
	const bayiler = useBayiler();
	const investors = useInvestors(reportKind === 'balance');
	const choices = [...(bayiler.data?.bayiler ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name, 'tr'),
	);
	const [rows, setRows] = useState<Draft[]>(() => numericRows(value));
	const selectedIds = (filters: PurchaseFilters) =>
		filters.bayiIds ?? (filters.bayiId ? [filters.bayiId] : []);
	const [bayiIds, setBayiIds] = useState(() => selectedIds(value));
	const [synced, setSynced] = useState(value);
	const [error, setError] = useState('');
	if (
		JSON.stringify([
			synced.bayiIds,
			synced.bayiId,
			synced.numericFilters,
			synced.minTotal,
			synced.maxTotal,
		]) !==
		JSON.stringify([
			value.bayiIds,
			value.bayiId,
			value.numericFilters,
			value.minTotal,
			value.maxTotal,
		])
	) {
		setSynced(value);
		setRows(numericRows(value));
		setBayiIds(selectedIds(value));
	}
	const pending =
		JSON.stringify([...bayiIds].sort()) !==
			JSON.stringify([...selectedIds(value)].sort()) ||
		JSON.stringify(rows.filter((r) => r.min !== '' || r.max !== '')) !==
			JSON.stringify(
				numericRows(value).filter((r) => r.min !== '' || r.max !== ''),
			);
	const active: { label: string; remove: () => void }[] = [];
	function removeKeys(...keys: string[]) {
		const next = { ...value } as Record<string, unknown>;
		for (const key of keys) delete next[key];
		setError('');
		onChange(next as T);
	}
	function addPill(label: string, ...keys: string[]) {
		active.push({ label, remove: () => removeKeys(...keys) });
	}
	for (const selectedId of selectedIds(value))
		active.push({
			label:
				'Bayi: ' +
				(choices.find((row) => row._id === selectedId)?.name ?? selectedId),
			remove: () => {
				const ids = selectedIds(value).filter((id) => id !== selectedId);
				onChange({
					...value,
					bayiIds: ids.length ? ids : undefined,
					bayiId: undefined,
					bayiName: undefined,
				});
			},
		});
	if (!selectedIds(value).length && value.bayiName)
		addPill('Bayi: ' + value.bayiName, 'bayiName');
	if (value.purchaseId)
		addPill('Alış kaydı: #' + value.purchaseId.slice(-6), 'purchaseId');
	const investorId = (value as T & { investorId?: string }).investorId;
	if (investorId)
		addPill(
			'Yatırımcı: ' +
				(investors.data?.investors.find((row) => row._id === investorId)
					?.name ?? investorId),
			'investorId',
		);
	if (value.from || value.until) {
		const preset = PURCHASE_PERIOD_PRESETS.find((p) => {
			const range = purchasePresetRange(p.id);
			return range.from === value.from && range.until === value.until;
		});
		addPill(
			'Dönem: ' +
				(preset?.label ?? 'Özel aralık') +
				' · ' +
				(value.from ?? 'Başlangıç yok') +
				' – ' +
				(value.until ?? 'Bitiş yok'),
			'from',
			'until',
		);
	}
	if (value.minTotal !== undefined || value.maxTotal !== undefined)
		addPill(
			numericFilterLabel({
				field: 'total',
				min: value.minTotal,
				max: value.maxTotal,
			}),
			'minTotal',
			'maxTotal',
		);
	(value.numericFilters ?? []).forEach((filter, index) =>
		active.push({
			label: numericFilterLabel(filter),
			remove: () => {
				const next = (value.numericFilters ?? []).filter((_, i) => i !== index);
				onChange({ ...value, numericFilters: next.length ? next : undefined });
			},
		}),
	);
	const extra = value as PurchaseFilters & Record<string, unknown>;
	const movementLabels: Record<string, string> = {
		'purchase-entries': 'Alış',
		'all-sales': 'Satış',
		'full-stock-sales': 'Tüm stok satışı',
		'partial-sales': 'Kısmi satış',
	};
	if (extra.movementType && extra.movementType !== 'all-movements')
		addPill(
			'Hareket: ' +
				(movementLabels[String(extra.movementType)] ??
					String(extra.movementType)),
			'movementType',
		);
	if (extra.productType)
		addPill(
			'Ürün: ' +
				(PURCHASE_PRODUCT_TYPES[
					extra.productType as keyof typeof PURCHASE_PRODUCT_TYPES
				]?.label ?? String(extra.productType)),
			'productType',
		);
	if (extra.memoryGb)
		addPill('Bellek: ' + String(extra.memoryGb) + ' GB', 'memoryGb');
	const groupLabels: Record<string, string> = {
		purchase: 'Mal alış',
		other: 'Elle eklenen gider',
		sale: 'Satış',
		investment: 'Elle eklenen gelir',
	};
	if (extra.group)
		addPill(
			'İşlem kaynağı: ' +
				(groupLabels[String(extra.group)] ?? String(extra.group)),
			'group',
		);
	if (extra.direction)
		addPill(
			extra.direction === 'income' ? 'Ana tür: Gelir' : 'Ana tür: Gider',
			'direction',
		);
	if (extra.categoryId)
		addPill('Alt tür: ' + (categoryName ?? 'Seçili alt tür'), 'categoryId');
	function apply(period: PurchaseFilters = value) {
		const numericFilters = rows
			.filter((r) => !r.kind && (r.min !== '' || r.max !== ''))
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
		const parsed = purchaseFiltersSchema.safeParse({
			...period,
			bayiIds: bayiIds.length ? bayiIds : undefined,
			bayiId: undefined,
			bayiName: undefined,
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
		const {
			from: _from,
			until: _until,
			bayiName: _bayiName,
			bayiId: _bayiId,
			bayiIds: _bayiIds,
			numericFilters: _numericFilters,
			minTotal: _minTotal,
			maxTotal: _maxTotal,
			...extras
		} = value;
		onChange({
			...extras,
			...(bayiIds.length ? { investorId: undefined } : {}),
			...Object.fromEntries(
				Object.entries(parsed.data).filter(([, v]) => v !== undefined),
			),
		} as T);
	}
	function update(index: number, patch: Partial<Draft>) {
		setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
	}
	return (
		<div className='min-w-0 space-y-3'>
			<details
				ref={panel}
				id={reportKind === 'stock' ? 'stock-report-filters' : id}
				open
				className='min-w-0 scroll-mt-20 rounded-xl border-2 border-sky-500/40 bg-sky-500/10 p-3 sm:p-4'
			>
				<AdminSummary index={2}>
					{reportKind === 'balance'
						? 'Bakiye raporu filtreleri'
						: reportKind === 'stock'
							? 'Stok ve satış raporu filtreleri'
							: 'Alış ve rapor filtreleri'}
				</AdminSummary>
				<p className='mt-3 flex items-start gap-2 text-sm font-medium'>
					<ListFilter size={18} className='mt-0.5 shrink-0' />
					Bu filtreler aşağıdaki liste, toplamlar ve rapor verilerinin tamamını
					değiştirir.
				</p>
				<p className='mt-1 text-xs opacity-75'>
					{reportKind === 'stock'
						? 'Mevcut envanter bu raporun dışındadır. Bayi filtresi alışları ve bayi dağılımı kayıtlı satışları gösterir.'
						: reportKind === 'balance'
							? 'Genel bakiye tüm hareketleri kapsar; dönem özeti ve hareket listesi filtrelenir.'
							: 'Her seçili ürün kendi koşullarını aynı satırda karşılamalıdır. Belirtilen ürünlerin tümünü içeren alışlar rapora alınır.'}
				</p>
				<form
					className='mt-3 space-y-3'
					aria-label={
						reportKind === 'balance'
							? 'Bakiye raporu filtreleri'
							: reportKind === 'stock'
								? 'Stok ve satış filtreleri'
								: 'Alış ve PDF filtreleri'
					}
					onSubmit={(e) => {
						e.preventDefault();
						apply();
					}}
				>
					{reportKind === 'balance' && (
						<label className='flex w-full max-w-64 flex-col gap-1 text-sm'>
							Yatırımcı
							<select
								aria-label='Rapor yatırımcı filtresi'
								className={control}
								value={investorId ?? ''}
								onChange={(event) =>
									onChange({
										...value,
										investorId: event.target.value || undefined,
										bayiId: undefined,
										bayiIds: undefined,
										bayiName: undefined,
									})
								}
							>
								<option value=''>Tüm yatırımcılar</option>
								{(investors.data?.investors ?? []).map((row) => (
									<option key={row._id} value={row._id}>
										{row.name}
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
					<PurchasePeriodPicker
						value={value}
						onChange={(range) => onChange({ ...value, ...range })}
					/>
					<fieldset className='space-y-2'>
						<legend className='mb-2 text-sm font-medium'>
							Filtre koşulları
						</legend>
						<p className='text-xs opacity-70'>
							Bayi seçenekleri birlikte uygulanır. Koşullar sunucuda
							filtrelenir; seçimlerinizi tamamladıktan sonra Filtreleri uygula
							düğmesini kullanın.
						</p>
						<p className='text-xs opacity-70'>
							{reportKind === 'balance'
								? 'Gelir ve gider hareketlerini işlem tutarına göre sınırlandırın. Sınırlar dahildir; boş sınırlar uygulanmaz.'
								: 'Önce kapsamı, sonra özelliği seçin. Aynı ürünün koşulları birlikte uygulanır; stok raporunda farklı ürün kapsamlarından birine uyan satırlar gösterilir. Sınırlar dahildir, boş sınırlar uygulanmaz.'}
						</p>
						{rows.map((row, index) => (
							<div
								key={index}
								className='flex min-w-0 flex-wrap items-end gap-2'
							>
								<label className='flex max-w-full flex-col gap-1 text-xs'>
									Kapsam
									<select
										aria-label={index + 1 + '. koşul ürünü'}
										className={control + ' w-48'}
										value={
											row.kind === 'bayi'
												? 'bayi'
												: row.productType
													? row.memoryGb === undefined
														? row.productType
														: row.productType + ':' + row.memoryGb
													: recordFields.includes(row.field)
														? 'operation'
														: 'all'
										}
										onChange={(event) => {
											const scope = event.target.value;
											if (row.kind === 'bayi' && scope !== 'bayi')
												setBayiIds([]);
											if (scope === 'bayi') {
												update(index, {
													kind: 'bayi',
													field: 'total',
													min: '',
													max: '',
													productType: undefined,
													memoryGb: undefined,
												});
												return;
											}
											const [type, size] = scope.split(':');
											update(index, {
												kind: undefined,
												productType:
													scope === 'all' || scope === 'operation'
														? undefined
														: (type as Draft['productType']),
												memoryGb: size ? Number(size) : undefined,
												field:
													scope === 'operation'
														? 'total'
														: recordFields.includes(row.field)
															? 'lineTotal'
															: row.field,
											});
										}}
									>
										<option
											value='bayi'
											disabled={rows.some(
												(other, i) => i !== index && other.kind === 'bayi',
											)}
										>
											Bayi
										</option>
										<option value='operation'>İşlem geneli</option>
										{reportKind !== 'balance' && (
											<>
												<option value='all'>Tüm ürünler</option>
												<option value='EMMC'>Tüm eMMC</option>
												<option value='EMCP'>Tüm eMCP</option>
												{purchaseChoices().map((choice) => (
													<option
														key={choice.type + ':' + choice.memoryGb}
														value={
															choice.requiresMemorySize
																? choice.type + ':' + choice.memoryGb
																: choice.type
														}
													>
														{formatPurchaseProduct(choice)}
													</option>
												))}
											</>
										)}
									</select>
								</label>
								{row.kind === 'bayi' ? (
									<div className='w-56 max-w-full'>
										<BayiPicker
											compact
											multiple
											value={bayiIds}
											onChange={setBayiIds}
											label='Rapor bayi filtresi'
										/>
									</div>
								) : (
									<>
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
													update(index, {
														field: e.target.value as NumericField,
													})
												}
											>
												{numericFieldsFor(reportKind)
													.filter((field) => field !== 'memoryGb')
													.filter((field) =>
														recordFields.includes(row.field) && !row.productType
															? recordFields.includes(field)
															: !recordFields.includes(field),
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
															[bound]:
																typeof v === 'function' ? v(row[bound]) : v,
														})
													}
													className={
														control + ' w-full [&_input]:w-12 [&_input]:min-w-0'
													}
													stepperClassName='rounded px-1 py-1'
												/>
											</label>
										))}
									</>
								)}
								<button
									type='button'
									className={control}
									aria-label={'Koşulu kaldır ' + (index + 1)}
									onClick={() => {
										if (row.kind === 'bayi') setBayiIds([]);
										setRows(rows.filter((_, i) => i !== index));
									}}
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
								setRows([{ kind: 'bayi', field: 'total', min: '', max: '' }]);
								setBayiIds([]);
								setError('');
								onChange({} as T);
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
						{active.map(({ label, remove }, i) => (
							<li
								key={i}
								className='inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/40 bg-button-bg px-3 py-1.5 font-medium'
							>
								<span className='min-w-0 break-words'>{label}</span>
								<button
									type='button'
									aria-label={label + ' filtresini kaldır'}
									title='Filtreyi kaldır'
									onClick={remove}
									className='inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-text/10 focus-visible:outline-2'
								>
									<X size={13} aria-hidden />
								</button>
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
