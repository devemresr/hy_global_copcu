import { Trash2 } from 'lucide-react';
import { AdminCollapseIcon } from './AdminCollapseHeading';
import { adminHeadingClass } from '../../constants/adminHeading.constant';
import {
	STOCK_CONTROL,
	STOCK_BUTTON,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { stockSaleSchema } from '../../schemas/stock.schema';
import {
	useRecordStockSale,
	type StockPosition,
} from '../../hooks/api/endpoints/useStock';
import { formatOrderProduct } from '../../helpers/orderProduct.helper';
import { ORDER_QUANTITY_UNIT_LABELS } from '../../constants/orderProducts.constant';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { compareStockProducts } from '../../helpers/stockView.helper';
import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';

const control = STOCK_CONTROL;
const button = STOCK_BUTTON;
const numberControl = STOCK_NUMBER_CONTROL;

type Row = {
	id: number;
	key: string;
	unit: 'piece' | 'kg' | 'g';
	quantity: number | '';
	revenue: number | '';
};
const number = (n: number) =>
	n.toLocaleString('tr-TR', { maximumFractionDigits: 6 });

export function StockSaleDialog({
	positions,
	onClose,
	closeOnOutsideClick = true,
}: {
	positions: StockPosition[];
	onClose: () => void;
	closeOnOutsideClick?: boolean;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	const submitting = useRef(false);
	const save = useRecordStockSale();
	const dismiss = useModalDismiss(onClose, {
		disabled: save.isPending,
		closeOnOutsideClick,
	});
	const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
	const available = positions
		.filter((p) => p.quantity > 0)
		.sort(compareStockProducts);
	const [mode, setMode] = useState<'partial' | 'complete'>('complete');
	const [rows, setRows] = useState<Row[]>(() =>
		available[0]
			? [
					{
						id: 0,
						key: available[0].key,
						unit: available[0].quantityUnit,
						quantity: '',
						revenue: '',
					},
				]
			: [],
	);
	const [nextId, setNextId] = useState(1);
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const [error, setError] = useState('');
	useEffect(() => {
		const node = dialog.current;
		node?.showModal();
		return () => node?.close();
	}, []);
	function edited() {
		setRequestId(crypto.randomUUID());
		setError('');
	}
	function update(id: number, fields: Partial<Row>) {
		setRows((current) =>
			current.map((row) => (row.id === id ? { ...row, ...fields } : row)),
		);
		edited();
	}
	async function submit() {
		if (submitting.current) return;
		const parsed = stockSaleSchema.safeParse({
			requestId,
			mode,
			lines: rows.map((row) => {
				const position = positions.find((p) => p.key === row.key);
				return {
					type: position?.type,
					memoryGb: position?.memoryGb,
					quantityUnit: row.unit,
					quantity:
						mode === 'complete'
							? Number(
									(
										(position?.quantity ?? 0) * (row.unit === 'g' ? 1000 : 1)
									).toFixed(6),
								)
							: row.quantity === ''
								? NaN
								: Number(row.quantity),
					revenue: row.revenue === '' ? NaN : Number(row.revenue),
				};
			}),
		});
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			setError(
				`${typeof issue.path[1] === 'number' ? `${issue.path[1] + 1}. ürün: ` : ''}${issue.message}`,
			);
			return;
		}
		submitting.current = true;
		try {
			await save.mutateAsync(parsed.data);
			toast.success('Stok yenileme işlemi kaydedildi');
			onClose();
		} catch (failure) {
			const message = (failure as Error).message;
			setError(message);
			toast.error('Stok yenileme kaydedilemedi', { description: message });
		} finally {
			submitting.current = false;
		}
	}
	return (
		<dialog
			ref={dialog}
			{...dismiss}
			aria-labelledby='stock-sale-title'
			className='m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-modal-bg p-4 text-text backdrop:bg-black/60 sm:p-6'
		>
			<div className='mb-2 flex items-center justify-between gap-3'>
				<h3 id='stock-sale-title' className='text-lg font-semibold'>
					Stok yenileme
				</h3>
				<ModalCloseButton onClick={onClose} disabled={save.isPending} />
			</div>
			<p className='mb-4 text-sm text-text/70'>
				Birden fazla ürünü aynı işlemde kaydedin. Miktarlar ürünün toplam
				stoğundan düşülür.
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
				className='space-y-4'
			>
				<fieldset disabled={save.isPending} className='min-w-0 space-y-3'>
					<div
						role='group'
						aria-label='Yenileme türü'
						className='flex flex-wrap gap-2'
					>
						{(['complete', 'partial'] as const).map((value) => (
							<button
								key={value}
								autoFocus={value === 'complete'}
								type='button'
								aria-pressed={mode === value}
								onClick={() => {
									setMode(value);
									edited();
								}}
								className={`${button} rounded-full! px-3! ${mode === value ? 'border-text! bg-text! text-bg!' : ''}`}
							>
								{value === 'complete' ? 'Tam yenileme' : 'Kısmi yenileme'}
							</button>
						))}
					</div>
					{rows.map((row, index) => {
						const position = positions.find((p) => p.key === row.key);
						const currentQuantity = Number(
							(
								(position?.quantity ?? 0) * (row.unit === 'g' ? 1000 : 1)
							).toFixed(6),
						);
						return (
							<fieldset
								key={row.id}
								className='min-w-0 space-y-3 rounded-xl border border-border p-3'
							>
								<legend className='sr-only'>{index + 1}. ürün</legend>
								<div className={adminHeadingClass(index)}>
									<button
										type='button'
										className='flex min-w-0 flex-1 items-center gap-2 text-left'
										aria-label={`${index + 1}. ürün detayları`}
										aria-expanded={!collapsed.has(row.id)}
										aria-controls={`restock-row-${row.id}`}
										onClick={() =>
											setCollapsed((current) => {
												const next = new Set(current);
												if (next.has(row.id)) next.delete(row.id);
												else next.add(row.id);
												return next;
											})
										}
									>
										<AdminCollapseIcon expanded={!collapsed.has(row.id)} />
										<span>
											{index + 1}. ürün
											{position ? ` · ${formatOrderProduct(position)}` : ''}
										</span>
									</button>
									<button
										type='button'
										className={`${button} w-9 px-0!`}
										disabled={rows.length <= 1}
										aria-label={`${index + 1}. yenileme ürününü sil`}
										title='Ürünü kaldır'
										onClick={() => {
											setRows((current) =>
												current.filter((entry) => entry.id !== row.id),
											);
											edited();
										}}
									>
										<Trash2 size={16} aria-hidden />
									</button>
								</div>
								<div
									id={`restock-row-${row.id}`}
									hidden={collapsed.has(row.id)}
									className={collapsed.has(row.id) ? 'hidden' : 'space-y-2'}
								>
									<div className='flex min-w-0 flex-wrap items-start gap-2'>
										<label className='flex w-44 max-w-full shrink-0 flex-col gap-1 text-xs'>
											Ürün
											<select
												aria-label={`${index + 1}. yenileme ürünü`}
												className={`${control} w-full pe-6!`}
												value={row.key}
												onChange={(event) => {
													const p = positions.find(
														(entry) => entry.key === event.target.value,
													);
													if (p)
														update(row.id, {
															key: p.key,
															unit: p.quantityUnit,
															quantity: '',
															revenue: '',
														});
												}}
											>
												{available
													.filter(
														(p) =>
															p.key === row.key ||
															!rows.some((entry) => entry.key === p.key),
													)
													.map((p) => (
														<option key={p.key} value={p.key}>
															{formatOrderProduct(p)} · {number(p.quantity)}{' '}
															{ORDER_QUANTITY_UNIT_LABELS[p.quantityUnit]}
														</option>
													))}
											</select>
										</label>
										{position?.quantityUnit === 'kg' && (
											<label className='flex w-16 shrink-0 flex-col gap-1 text-xs'>
												Birim
												<select
													aria-label={`${index + 1}. yenileme birimi`}
													className={`${control} w-full pe-5!`}
													value={row.unit}
													onChange={(event) =>
														update(row.id, {
															unit: event.target.value as Row['unit'],
															quantity: '',
														})
													}
												>
													<option value='kg'>kg</option>
													<option value='g'>g</option>
												</select>
											</label>
										)}
										{mode === 'partial' ? (
											<label className='flex w-fit flex-col gap-1 text-xs'>
												Miktar ({ORDER_QUANTITY_UNIT_LABELS[row.unit]})
												<NumberInputWithSteppers
													id={`restock-quantity-${row.id}`}
													ariaLabel={`${index + 1}. yenileme miktarı`}
													disableWheel
													decimalPlaces={row.unit === 'piece' ? 0 : 3}
													value={row.quantity}
													onChange={(change) =>
														update(row.id, {
															quantity:
																typeof change === 'function'
																	? change(row.quantity)
																	: change,
														})
													}
													steppers={
														row.unit === 'kg'
															? [
																	{ amount: 0.1, label: '+0,1' },
																	{ amount: 1, label: '+1' },
																]
															: [
																	{ amount: 1, label: '+1' },
																	{ amount: 5, label: '+5' },
																]
													}
													className={numberControl}
													stepperClassName={STOCK_STEPPER}
												/>
											</label>
										) : (
											<div className='flex w-fit flex-col gap-1 text-xs'>
												<span>Çıkış miktarı</span>
												<output
													className={`${control} inline-flex items-center gap-1 tabular-nums`}
												>
													{number(currentQuantity)}{' '}
													{ORDER_QUANTITY_UNIT_LABELS[row.unit]}
												</output>
											</div>
										)}
										<label className='flex w-fit flex-col gap-1 text-xs'>
											Satış geliri (TL)
											<NumberInputWithSteppers
												id={`restock-revenue-${row.id}`}
												ariaLabel={`${index + 1}. yenileme satış geliri`}
												disableWheel
												decimalPlaces={2}
												value={row.revenue}
												onChange={(change) =>
													update(row.id, {
														revenue:
															typeof change === 'function'
																? change(row.revenue)
																: change,
													})
												}
												steppers={[
													{ amount: 100, label: '+100' },
													{ amount: 1000, label: '+1k' },
												]}
												className={numberControl}
												stepperClassName={STOCK_STEPPER}
											/>
										</label>
									</div>
									<p className='text-xs text-text/70'>
										{mode === 'complete'
											? `Bu üründen ${number(currentQuantity)} ${ORDER_QUANTITY_UNIT_LABELS[row.unit]} stoktan düşülür.`
											: `Mevcut toplam: ${number(currentQuantity)} ${ORDER_QUANTITY_UNIT_LABELS[row.unit]}`}
									</p>
								</div>
							</fieldset>
						);
					})}
					<button
						type='button'
						className={button}
						disabled={
							rows.length >= 200 ||
							!available.some((p) => !rows.some((row) => row.key === p.key))
						}
						onClick={() => {
							const p = available.find(
								(entry) => !rows.some((row) => row.key === entry.key),
							);
							if (p) {
								setRows((current) => [
									...current,
									{
										id: nextId,
										key: p.key,
										unit: p.quantityUnit,
										quantity: '',
										revenue: '',
									},
								]);
								setNextId(nextId + 1);
								edited();
							}
						}}
					>
						+ Ürün ekle
					</button>
				</fieldset>
				<p className='text-sm font-semibold'>
					Toplam satış geliri:{' '}
					{rows
						.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0)
						.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
				</p>
				{error && (
					<p role='alert' className='text-sm text-red-500'>
						{error}
					</p>
				)}
				<button
					type='submit'
					disabled={save.isPending || rows.length === 0}
					className={button}
				>
					{save.isPending ? 'Kaydediliyor...' : 'Yenilemeyi kaydet'}
				</button>
			</form>
		</dialog>
	);
}
