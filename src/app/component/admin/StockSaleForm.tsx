import { TradeRows, type TradeRow } from './TradeRows';
import { useOrderDraft } from '../../hooks/useOrderDraft';
import {
	orderDraftKey,
	saleDraftSchema,
	type SaleDraft,
} from '../../helpers/orderDraft.helper';
import { compareProductChoices } from '../../helpers/orderChoices.helper';

import {
	STOCK_CONTROL,
	STOCK_BUTTON,
} from '../../constants/stockStyles.constant';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { stockSaleSchema } from '../../schemas/stock.schema';
import {
	useRecordStockSale,
	type StockPosition,
} from '../../hooks/api/endpoints/useStock';
import { formatOrderProduct } from '../../helpers/orderProduct.helper';
import {
	ORDER_PRODUCT_TYPES,
	ORDER_QUANTITY_UNIT_LABELS,
} from '../../constants/orderProducts.constant';

const control = STOCK_CONTROL;
const button = STOCK_BUTTON;

type Row = SaleDraft['rows'][number];
const number = (n: number) =>
	n.toLocaleString('tr-TR', { maximumFractionDigits: 6 });

export function StockSaleForm({
	positions,
	onSaved,
}: {
	positions: StockPosition[];
	onSaved: () => void;
}) {
	const submitting = useRef(false);
	const save = useRecordStockSale();
	const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
	const available = positions
		.filter((p) => p.quantity > 0)
		.sort(
			(a, b) =>
				compareProductChoices(a, b) ||
				a.quantityUnit.localeCompare(b.quantityUnit),
		);
	const initialDraft = (): SaleDraft => ({
		mode: 'complete',
		rows: available[0]
			? [
					{
						id: 0,
						key: available[0].key,
						unit: available[0].quantityUnit,
						quantity: Math.min(1, available[0].quantity),
						revenue: '',
					},
				]
			: [],
		nextId: 1,
		requestId: crypto.randomUUID(),
	});
	const draft = useOrderDraft(
		orderDraftKey('sale'),
		saleDraftSchema,
		initialDraft,
		'satış',
	);
	const { mode, rows, nextId, requestId } = draft.value;
	const setRows = (action: import('react').SetStateAction<Row[]>) =>
		draft.setValue((current) => ({
			...current,
			rows: typeof action === 'function' ? action(current.rows) : action,
		}));
	const setMode = (value: SaleDraft['mode']) =>
		draft.setValue((current) => ({ ...current, mode: value }));
	const setNextId = (value: number) =>
		draft.setValue((current) => ({ ...current, nextId: value }));
	const setRequestId = (value: string) =>
		draft.setValue((current) => ({ ...current, requestId: value }));
	const [error, setError] = useState('');
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

	const saleQuantity = (row: Row) =>
		mode === 'complete'
			? Number(
					(
						(positions.find((p) => p.key === row.key)?.quantity ?? 0) *
						(row.unit === 'g' ? 1000 : 1)
					).toFixed(6),
				)
			: Number(row.quantity);
	const saleRevenue = (row: Row): number | '' =>
		row.unitPrice === undefined
			? row.revenue
			: row.unitPrice === '' || saleQuantity(row) <= 0
				? ''
				: Math.round(row.unitPrice * saleQuantity(row) * 100) / 100;
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
					revenue: saleRevenue(row) === '' ? NaN : Number(saleRevenue(row)),
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
			draft.clear();
			toast.success('Satış işlemi kaydedildi');
			onSaved();
		} catch (failure) {
			const message = (failure as Error).message;
			setError(message);
			toast.error('Satış kaydedilemedi', { description: message });
		} finally {
			submitting.current = false;
		}
	}
	const uiRows: TradeRow[] = rows.map((row) => {
		const p = positions.find((p) => p.key === row.key);
		return {
			id: row.id,
			type: p?.type ?? 'EMMC',
			memoryGb: p?.memoryGb ?? null,
			requiresMemorySize: p
				? ORDER_PRODUCT_TYPES[p.type].requiresMemorySize
				: true,
			quantityUnit: row.unit,
			quantity: mode === 'complete' ? saleQuantity(row) : row.quantity,
			unitPriceOverride:
				row.unitPrice ??
				(row.revenue !== '' && saleQuantity(row) > 0
					? row.revenue / saleQuantity(row)
					: ''),
			totalPriceOverride: row.unitPrice === undefined ? row.revenue : null,
		};
	});
	const addRow = () => {
		const p = available.find((p) => !rows.some((r) => r.key === p.key));
		if (p) {
			setRows((current) => [
				...current,
				{
					id: nextId,
					key: p.key,
					unit: p.quantityUnit,
					quantity: Math.min(1, p.quantity),
					revenue: '',
				},
			]);
			setNextId(nextId + 1);
			edited();
		}
	};
	return (
		<section
			aria-labelledby='new-sale'
			className='min-w-0 rounded-xl border border-border p-3 sm:p-4'
		>
			<h2 id='new-sale' className='mb-4 text-lg font-semibold'>
				Yeni satış
			</h2>
			<p className='mb-3 text-xs text-text/70'>
				Miktar ürünün toplam stoğundan düşülür. Tüm stok satışı seçildiğinde
				seçili ürünün kalan miktarının tamamı satılır.
			</p>
			{draft.restoredAt && (
				<p
					role='status'
					className='mb-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs'
				>
					{new Date(draft.restoredAt).toLocaleString('tr-TR', {
						timeZone: 'Europe/Istanbul',
					})}{' '}
					tarihli kaydedilmemiş satış verileri yüklendi.
				</p>
			)}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void submit();
				}}
				className='space-y-3'
			>
				<fieldset disabled={save.isPending} className='min-w-0 space-y-3'>
					<div
						role='group'
						aria-label='Satış türü'
						className='flex flex-wrap gap-2'
					>
						{(['partial', 'complete'] as const).map((value) => (
							<button
								key={value}
								type='button'
								aria-pressed={mode === value}
								onClick={() => {
									setMode(value);
									edited();
								}}
								className={
									button +
									' rounded-full! ' +
									(mode === value ? 'border-text! bg-text! text-bg!' : '')
								}
							>
								{value === 'complete' ? 'Tüm stok satışı' : 'Kısmi satış'}
							</button>
						))}
					</div>
					{!available.length && (
						<p role='status'>Satılabilir stok yok. Önce alış kaydı ekleyin.</p>
					)}
					<TradeRows
						lines={uiRows}
						kind='sale'
						disabled={save.isPending}
						quantityLocked={mode === 'complete'}
						collapsedRows={collapsed}
						onToggle={(id) =>
							setCollapsed((current) => {
								const next = new Set(current);
								if (next.has(id)) next.delete(id);
								else next.add(id);
								return next;
							})
						}
						onRemove={(id) => {
							setRows((current) => current.filter((r) => r.id !== id));
							edited();
						}}
						onAdd={addRow}
						canAdd={available.some(
							(p) => !rows.some((row) => row.key === p.key),
						)}
						totals={rows.map((row) =>
							saleRevenue(row) === '' ? null : Number(saleRevenue(row)),
						)}
						effectivePrice={(line) =>
							typeof line.unitPriceOverride === 'number'
								? line.unitPriceOverride
								: ''
						}
						unitOptions={(line) => {
							const row = rows.find((r) => r.id === line.id)!;
							return positions.find((p) => p.key === row.key)?.quantityUnit ===
								'piece'
								? ['piece']
								: ['kg', 'g'];
						}}
						onUpdate={(id, patch) => {
							const row = rows.find((r) => r.id === id)!;
							if (patch.quantityUnit) {
								update(id, {
									unit: patch.quantityUnit,
									quantity: '',
									unitPrice: undefined,
									revenue: '',
								});
								return;
							}
							if (
								patch.totalPriceOverride !== undefined &&
								patch.totalPriceOverride !== null
							) {
								update(id, {
									revenue: patch.totalPriceOverride,
									unitPrice: undefined,
								});
								return;
							}
							if ('unitPriceOverride' in patch) {
								update(id, { unitPrice: patch.unitPriceOverride ?? '' });
								return;
							}
							update(id, { quantity: patch.quantity ?? row.quantity });
						}}
						productInput={(line, index) => {
							const row = rows.find((r) => r.id === line.id)!;
							return (
								<select
									id={'type-' + line.id}
									aria-label={index + 1 + '. satır ürün ve bellek'}
									className={control + ' h-9! w-full! min-w-0'}
									value={row.key}
									onChange={(e) => {
										const p = positions.find((p) => p.key === e.target.value);
										if (p)
											update(row.id, {
												key: p.key,
												unit: p.quantityUnit,
												quantity: Math.min(1, p.quantity),
												unitPrice: undefined,
												revenue: '',
											});
									}}
								>
									{!available.some((p) => p.key === row.key) && (
										<option value={row.key} disabled>
											Seçili ürün artık stokta yok
										</option>
									)}
									{available
										.filter(
											(p) =>
												p.key === row.key || !rows.some((r) => r.key === p.key),
										)
										.map((p) => (
											<option key={p.key} value={p.key}>
												{formatOrderProduct(p)}
												{ORDER_PRODUCT_TYPES[p.type].requiresMemorySize
													? ''
													: ' · ' + ORDER_QUANTITY_UNIT_LABELS[p.quantityUnit]}
											</option>
										))}
								</select>
							);
						}}
						rowNote={(line) => {
							const row = rows.find((r) => r.id === line.id)!;
							const p = positions.find((p) => p.key === row.key);
							return (
								'Mevcut stok: ' +
								number((p?.quantity ?? 0) * (row.unit === 'g' ? 1000 : 1)) +
								' ' +
								ORDER_QUANTITY_UNIT_LABELS[row.unit]
							);
						}}
					/>
				</fieldset>
				<div className='mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-button-bg p-3 font-semibold'>
					<span>Genel toplam</span>
					<span aria-live='polite' className='text-lg tabular-nums'>
						{rows
							.reduce((sum, row) => sum + Number(saleRevenue(row) || 0), 0)
							.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
					</span>
				</div>
				{error && (
					<p role='alert' className='text-sm text-red-500'>
						{error}
					</p>
				)}
				<div className='mt-4 flex flex-wrap items-center gap-3'>
					<button
						type='submit'
						className={button + ' font-semibold'}
						disabled={save.isPending || !rows.length || !available.length}
					>
						{save.isPending ? 'Kaydediliyor...' : 'Satışı kaydet'}
					</button>
					<button
						type='button'
						className={button + ' ml-auto'}
						disabled={save.isPending}
						onClick={() => {
							draft.clear();
							setCollapsed(new Set());
							setError('');
						}}
					>
						Satırları sıfırla
					</button>
				</div>
			</form>
		</section>
	);
}
