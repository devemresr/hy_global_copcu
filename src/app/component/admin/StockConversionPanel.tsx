import { BayiPicker } from './BayiPicker';
import { Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSummary } from './AdminCollapseHeading';
import {
	NumberInputWithSteppers,
	type Steppers,
} from '../NumberInputWithSteppers';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
import { formatPurchaseProduct } from '../../helpers/purchaseProduct.helper';
import { compareProductChoices } from '../../helpers/purchaseChoices.helper';
import {
	useConvertStock,
	useStockConversions,
	type ConversionUnit,
} from '../../hooks/api/endpoints/useStockConversions';

const unitLabels = { piece: 'adet', kg: 'kg', g: 'g' };
const quantity = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const keyOf = (p: {
	type: string;
	memoryGb: number | null;
	quantityUnit: string;
}) => `${p.type}:${p.memoryGb}:${p.quantityUnit}`;
const steppers = (unit: ConversionUnit): Steppers =>
	unit === 'kg'
		? [
				{ amount: 0.1, label: '+0,1' },
				{ amount: 1, label: '+1' },
			]
		: [
				{ amount: 1, label: '+1' },
				{ amount: unit === 'g' ? 10 : 5, label: unit === 'g' ? '+10' : '+5' },
			];

type Row = {
	id: string;
	productKey: string;
	bayiId: string;
	sourceLotId: string;
	fromUnit: ConversionUnit;
	toUnit: ConversionUnit;
	fromQuantity: number | '';
	toQuantity: number | '';
};
const newRow = (): Row => ({
	id: crypto.randomUUID(),
	productKey: '',
	bayiId: '',
	sourceLotId: '',
	fromUnit: 'piece',
	toUnit: 'kg',
	fromQuantity: '',
	toQuantity: '',
});
export function StockConversionPanel() {
	const location = useLocation();
	const [open, setOpen] = useState(location.hash === '#stock-unit-conversion');
	const data = useStockConversions(open),
		save = useConvertStock();
	const [rows, setRows] = useState<Row[]>(() => [newRow()]);
	const [note, setNote] = useState('');
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const sources = data.data?.sources ?? [];
	const products = [
		...new Map(sources.map((lot) => [keyOf(lot), lot])).values(),
	].sort(
		(a, b) =>
			compareProductChoices(a, b) ||
			a.quantityUnit.localeCompare(b.quantityUnit),
	);
	const bayiKey = (lot: (typeof sources)[number]) => lot.bayiId || 'unlinked';
	function edited() {
		setRequestId(crypto.randomUUID());
		save.reset();
	}
	function update(id: string, patch: Partial<Row>) {
		setRows((current) =>
			current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
		edited();
	}
	function selectSupplier(row: Row, bayiId: string) {
		const options = sources.filter(
			(lot) =>
				keyOf(lot) === row.productKey &&
				bayiKey(lot) === bayiId &&
				!rows.some(
					(other) => other.id !== row.id && other.sourceLotId === lot.lotId,
				),
		);
		const source = options.length === 1 ? options[0] : undefined;
		update(row.id, {
			bayiId,
			sourceLotId: source?.lotId ?? '',
			fromQuantity: source
				? Number(
						(source.remaining * (row.fromUnit === 'g' ? 1000 : 1)).toFixed(
							row.fromUnit === 'g' ? 3 : 6,
						),
					)
				: '',
			toQuantity: '',
		});
	}
	const isValid = (row: Row) => {
		const source = sources.find((lot) => lot.lotId === row.sourceLotId);
		return (
			source &&
			keyOf(source) === row.productKey &&
			bayiKey(source) === row.bayiId &&
			(row.fromUnit === 'piece') === (source.quantityUnit === 'piece') &&
			Number(row.fromQuantity) > 0 &&
			Number(row.fromQuantity) / (row.fromUnit === 'g' ? 1000 : 1) <=
				source.remaining &&
			Number(row.toQuantity) > 0 &&
			(row.fromUnit !== 'piece' || Number.isInteger(row.fromQuantity)) &&
			(row.toUnit !== 'piece' || Number.isInteger(row.toQuantity))
		);
	};
	const valid =
		rows.length > 0 &&
		rows.every(isValid) &&
		new Set(rows.map((row) => row.sourceLotId)).size === rows.length;
	return (
		<details
			id='stock-unit-conversion'
			open={open}
			onToggle={(event) => setOpen(event.currentTarget.open)}
			className='min-w-0 scroll-mt-24 rounded-xl border border-border'
		>
			<AdminSummary index={2}>
				<ArrowRightLeft size={17} aria-hidden />
				Stok birimini dönüştür
			</AdminSummary>
			<div className='min-w-0 space-y-4 p-3 sm:p-4'>
				<p className='text-sm text-text/75'>
					Her bayi için saydığınız veya tarttığınız miktarı ayrı girin. Bayi
					menüsündeki “Başka bayiden dönüştür” seçeneğiyle aynı ürüne yeni bir
					bayi satırı ekleyebilirsiniz. Kaynak alış ve maliyet korunur; bakiye
					değişmez. kg ve g aynı stok havuzudur.
				</p>
				{data.isPending && <p role='status'>Kaynak stoklar yükleniyor…</p>}
				{data.isError && (
					<p role='alert'>
						{data.error.message}{' '}
						<button
							type='button'
							className='underline'
							onClick={() => void data.refetch()}
						>
							Tekrar dene
						</button>
					</p>
				)}
				{data.data && (
					<form
						className='min-w-0 space-y-3'
						onSubmit={async (event) => {
							event.preventDefault();
							if (!valid || save.isPending) return;
							try {
								await save.mutateAsync({
									requestId,
									note,
									lines: rows.map((row) => ({
										sourceLotId: row.sourceLotId,
										fromUnit: row.fromUnit,
										fromQuantity: Number(row.fromQuantity),
										toUnit: row.toUnit,
										toQuantity: Number(row.toQuantity),
									})),
								});
								setRows([newRow()]);
								setNote('');
								edited();
								toast.success('Stok birimleri dönüştürüldü.');
							} catch {
								/* Keep values for retry. */
							}
						}}
					>
						<fieldset
							disabled={save.isPending}
							className='min-w-0 divide-y divide-border overflow-hidden rounded-xl border border-border disabled:opacity-60'
						>
							{rows.map((row, index) => {
								const product = products.find(
									(item) => keyOf(item) === row.productKey,
								);
								const matching = sources.filter(
									(lot) => keyOf(lot) === row.productKey,
								);
								const suppliers = [
									...new Map(
										matching.map((lot) => [
											bayiKey(lot),
											{
												id: bayiKey(lot),
												label:
													(lot.currentBayiName ||
														lot.bayiName ||
														'Belirtilmemiş') +
													' (' +
													quantity(
														matching
															.filter((item) => bayiKey(item) === bayiKey(lot))
															.reduce((sum, item) => sum + item.remaining, 0),
													) +
													' ' +
													unitLabels[lot.quantityUnit] +
													')',
											},
										]),
									).values(),
								];
								const lots = matching.filter(
									(lot) => bayiKey(lot) === row.bayiId,
								);
								const source = lots.find(
									(lot) => lot.lotId === row.sourceLotId,
								);
								const addOptions = suppliers.filter(
									(supplier) =>
										!rows.some(
											(other) =>
												other.productKey === row.productKey &&
												other.bayiId === supplier.id,
										),
								);
								return (
									<div
										key={row.id}
										className='min-w-0 space-y-2 p-3 odd:bg-text/3'
									>
										<div className='flex min-w-0 flex-wrap items-end gap-3'>
											<label className='flex min-w-0 flex-col gap-1 text-xs'>
												Ürün ve mevcut birim
												<select
													required
													className={
														STOCK_CONTROL + ' w-full max-w-full sm:w-56'
													}
													value={row.productKey}
													onChange={(event) => {
														const product = products.find(
															(item) => keyOf(item) === event.target.value,
														);
														update(row.id, {
															productKey: event.target.value,
															bayiId: '',
															sourceLotId: '',
															fromUnit: product?.quantityUnit ?? 'piece',
															toUnit:
																product?.quantityUnit === 'piece'
																	? 'kg'
																	: 'piece',
															fromQuantity: '',
															toQuantity: '',
														});
													}}
												>
													<option value='' disabled>
														Ürün seçin
													</option>
													{products.map((product) => (
														<option key={keyOf(product)} value={keyOf(product)}>
															{formatPurchaseProduct(product)} (
															{quantity(
																sources
																	.filter(
																		(lot) => keyOf(lot) === keyOf(product),
																	)
																	.reduce((sum, lot) => sum + lot.remaining, 0),
															)}{' '}
															{unitLabels[product.quantityUnit]})
														</option>
													))}
												</select>
											</label>
											<BayiPicker
												compact
												label='Bayi'
												value={row.bayiId}
												disabled={!product}
												options={suppliers}
												onChange={(id) => selectSupplier(row, id)}
												addOptions={addOptions}
												canAdd={!!row.bayiId && addOptions.length > 0}
												addLabel='Başka bayiden dönüştür'
												onAdd={(id) => {
													const next = {
														...row,
														id: crypto.randomUUID(),
														bayiId: id,
														sourceLotId: '',
														fromQuantity: 0,
														toQuantity: 0,
													} as Row;
													const lots = matching.filter(
														(lot) => bayiKey(lot) === id,
													);
													if (lots.length === 1) {
														next.sourceLotId = lots[0].lotId;
														if (
															source &&
															Number(row.fromQuantity) /
																(row.fromUnit === 'g' ? 1000 : 1) ===
																source.remaining
														)
															next.fromQuantity = Number(
																(
																	lots[0].remaining *
																	(row.fromUnit === 'g' ? 1000 : 1)
																).toFixed(row.fromUnit === 'g' ? 3 : 6),
															);
													}
													setRows((current) => {
														const position = current.findIndex(
															(item) => item.id === row.id,
														);
														return [
															...current.slice(0, position + 1),
															next,
															...current.slice(position + 1),
														];
													});
													edited();
												}}
											/>
											{lots.length > 1 && (
												<label className='flex min-w-0 flex-col gap-1 text-xs'>
													Kaynak alış
													<select
														className={
															STOCK_CONTROL + ' w-full max-w-full sm:w-56'
														}
														required
														value={row.sourceLotId}
														onChange={(event) => {
															const source = lots.find(
																(lot) => lot.lotId === event.target.value,
															);
															update(row.id, {
																sourceLotId: event.target.value,
																fromQuantity: source
																	? Number(
																			(
																				source.remaining *
																				(row.fromUnit === 'g' ? 1000 : 1)
																			).toFixed(row.fromUnit === 'g' ? 3 : 6),
																		)
																	: '',
																toQuantity: '',
															});
														}}
													>
														<option value='' disabled>
															Kaynak alış seçin
														</option>
														{lots.map((lot) => (
															<option
																key={lot.lotId}
																value={lot.lotId}
																disabled={rows.some(
																	(other) =>
																		other.id !== row.id &&
																		other.sourceLotId === lot.lotId,
																)}
															>
																#{lot.orderId.slice(-6)} ·{' '}
																{new Date(lot.createdAt).toLocaleDateString(
																	'tr-TR',
																	{ timeZone: 'Europe/Istanbul' },
																)}{' '}
																· {quantity(lot.remaining)}{' '}
																{unitLabels[lot.quantityUnit]} ·{' '}
																{lot.lotId.split(':').at(-1)?.slice(0, 8)}
															</option>
														))}
													</select>
												</label>
											)}
											{(['from', 'to'] as const).map((side) => {
												const unit =
														side === 'from' ? row.fromUnit : row.toUnit,
													value =
														side === 'from' ? row.fromQuantity : row.toQuantity;
												return (
													<div key={side} className='space-y-1'>
														<label
															htmlFor={row.id + side}
															className='block text-xs'
														>
															{side === 'from'
																? 'Düşülecek miktar'
																: 'Yeni miktar (sayım / tartım)'}
														</label>
														<div className='flex items-center gap-2'>
															<NumberInputWithSteppers
																id={row.id + side}
																value={value}
																onChange={(action) => {
																	const next =
																		typeof action === 'function'
																			? action(value)
																			: action;
																	update(
																		row.id,
																		side === 'from'
																			? { fromQuantity: next }
																			: { toQuantity: next },
																	);
																}}
																decimalPlaces={
																	unit === 'piece' ? 0 : unit === 'kg' ? 6 : 3
																}
																disableWheel
																steppers={steppers(unit)}
																className={STOCK_NUMBER_CONTROL}
																stepperClassName={STOCK_STEPPER}
															/>
															<select
																aria-label={
																	side === 'from'
																		? 'Kaynak birim'
																		: 'Hedef birim'
																}
																className={STOCK_CONTROL}
																value={unit}
																onChange={(event) => {
																	const next = event.target
																		.value as ConversionUnit;
																	const amount =
																		value === ''
																			? ''
																			: Number(
																					(
																						(value *
																							(unit === 'g' ? 0.001 : 1)) /
																						(next === 'g' ? 0.001 : 1)
																					).toFixed(next === 'g' ? 3 : 6),
																				);
																	update(
																		row.id,
																		side === 'from'
																			? { fromUnit: next, fromQuantity: amount }
																			: { toUnit: next, toQuantity: amount },
																	);
																}}
															>
																{(unit === 'piece'
																	? ['piece']
																	: ['kg', 'g']
																).map((unit) => (
																	<option key={unit} value={unit}>
																		{unitLabels[unit as ConversionUnit]}
																	</option>
																))}
															</select>
														</div>
													</div>
												);
											})}
											<button
												type='button'
												className={STOCK_BUTTON + ' lg:ml-4'}
												aria-label={index + 1 + '. dönüşüm satırını kaldır'}
												disabled={rows.length === 1}
												onClick={() => {
													setRows((current) =>
														current.filter((item) => item.id !== row.id),
													);
													edited();
												}}
											>
												<Trash2 size={16} aria-hidden />
											</button>
										</div>
										{source && (
											<p className='break-words text-xs text-text/70'>
												Kaynakta:{' '}
												{quantity(
													source.remaining * (row.fromUnit === 'g' ? 1000 : 1),
												)}{' '}
												{unitLabels[row.fromUnit]} ·{' '}
												{isValid(row)
													? 'Aktarılacak maliyet: ' +
														money(
															(source.remainingValue *
																Number(row.fromQuantity)) /
																(row.fromUnit === 'g' ? 1000 : 1) /
																source.remaining,
														)
													: 'Geçerli miktarları girin.'}{' '}
												·{' '}
												<Link
													className='underline'
													to={
														PAGE_PATHS.ANALYSIS +
														'?preset=purchases&purchaseId=' +
														source.orderId
													}
												>
													Kaynak alışı aç
												</Link>
											</p>
										)}
									</div>
								);
							})}
						</fieldset>
						<button
							type='button'
							className={STOCK_BUTTON + ' gap-1'}
							disabled={save.isPending || rows.length >= 100}
							onClick={() => {
								setRows((current) => [...current, newRow()]);
								edited();
							}}
						>
							<Plus size={15} aria-hidden />
							Satır ekle
						</button>
						<label className='flex max-w-md flex-col gap-1 text-xs'>
							Açıklama (isteğe bağlı)
							<input
								className={STOCK_CONTROL}
								maxLength={500}
								value={note}
								disabled={save.isPending}
								onChange={(event) => {
									setNote(event.target.value);
									edited();
								}}
							/>
						</label>
						<button
							type='submit'
							className={STOCK_BUTTON}
							disabled={!valid || save.isPending}
						>
							{save.isPending ? 'Kaydediliyor…' : 'Dönüşümü kaydet'}
						</button>
						{save.isError && (
							<p role='alert' className='text-sm text-red-500'>
								{save.error.message}
							</p>
						)}
						{sources.length === 0 && <p>Dönüştürülebilecek stok bulunmuyor.</p>}
					</form>
				)}
				<details className='min-w-0 rounded-lg border border-border'>
					<AdminSummary index={3}>
						Son dönüşümler ({data.data?.conversions.length ?? 0})
					</AdminSummary>
					<div className='space-y-2 p-2'>
						{data.data?.conversions.map((item, index) => (
							<details
								key={item._id}
								className='rounded-lg border border-border'
							>
								<AdminSummary index={index} className='flex-wrap text-xs'>
									{new Date(item.createdAt).toLocaleString('tr-TR', {
										timeZone: 'Europe/Istanbul',
									})}{' '}
									· {item.lines.length} satır ·{' '}
									{money(item.lines.reduce((sum, line) => sum + line.cost, 0))}
								</AdminSummary>
								<div className='space-y-2 break-words p-3 text-xs'>
									<p>
										{item.adminUsername} {item.note && '· ' + item.note}
									</p>
									{item.lines.map((line, index) => (
										<p key={index}>
											{formatPurchaseProduct(line)} · Bayi:{' '}
											{line.bayiName || 'Belirtilmemiş'} ·{' '}
											{quantity(line.fromQuantity)} {unitLabels[line.fromUnit]}{' '}
											→ {quantity(line.toQuantity)} {unitLabels[line.toUnit]} ·{' '}
											{money(line.cost)} ·{' '}
											<Link
												className='underline'
												to={
													PAGE_PATHS.ANALYSIS +
													'?preset=purchases&purchaseId=' +
													line.orderId
												}
											>
												Kaynak alış
											</Link>
										</p>
									))}
								</div>
							</details>
						))}
					</div>
				</details>
			</div>
		</details>
	);
}
