import { useState } from 'react';
import { AdminSummary } from './AdminCollapseHeading';
import { OrderHistoryFilters } from './OrderHistoryFilters';
import { Pagination } from './Pagination';
import {
	ORDER_MEMORY_SIZES,
	ORDER_PRODUCT_TYPE_ORDER,
	ORDER_PRODUCT_TYPES,
	ORDER_QUANTITY_UNIT_LABELS,
} from '../../constants/orderProducts.constant';
import { STOCK_CONTROL } from '../../constants/stockStyles.constant';
import type {
	StockFilters,
	StockResponse,
} from '../../hooks/api/endpoints/useStock';
import { formatOrderProduct } from '../../helpers/orderProduct.helper';

const money = (value: number | null) =>
	value === null
		? '—'
		: value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const quantity = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
const kindLabels = {
	purchase: 'Alış / stok girişi',
	complete: 'Tam yenileme',
	partial: 'Kısmi yenileme',
};
const presets = [
	{
		id: 'all',
		label: 'Tüm hareketler',
		movementType: 'all',
		view: 'movements',
	},
	{
		id: 'profit',
		label: 'Gerçekleşen kâr',
		movementType: 'restock',
		view: 'profits',
	},
	{
		id: 'purchase',
		label: 'Bayi bazlı stok girişleri',
		movementType: 'purchase',
		view: 'movements',
	},
	{
		id: 'restock',
		label: 'Stok yenilemeleri',
		movementType: 'restock',
		view: 'movements',
	},
] as const;

export function StockReport({
	data,
	filters,
	onChange,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	loading,
}: {
	data?: StockResponse;
	filters: StockFilters;
	onChange: (filters: StockFilters) => void;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	loading: boolean;
}) {
	const [view, setView] = useState<'movements' | 'profits'>('movements');
	const [groupBy, setGroupBy] = useState<'product' | 'memory'>('product');
	const profits =
		(groupBy === 'memory' ? data?.profitsByMemory : data?.profits) ?? [];
	const sortedProfits = [...profits].sort(
		(a, b) =>
			(a.type === null ? 0 : ORDER_PRODUCT_TYPE_ORDER.indexOf(a.type)) -
				(b.type === null ? 0 : ORDER_PRODUCT_TYPE_ORDER.indexOf(b.type)) ||
			(a.memoryGb ?? 0) - (b.memoryGb ?? 0) ||
			a.quantityUnit.localeCompare(b.quantityUnit),
	);
	return (
		<details
			open
			className='min-w-0 space-y-3'
			aria-label='Stok hareketleri ve kârlılık'
		>
			<AdminSummary index={1}>Stok hareketleri ve kârlılık</AdminSummary>
			<OrderHistoryFilters
				value={filters}
				context='stock'
				onChange={(next) => {
					if (next.bayiName) setView('movements');
					onChange({
						...next,
						movementType: next.bayiName ? 'purchase' : filters.movementType,
						productType: filters.productType,
						memoryGb: filters.memoryGb,
					});
				}}
			/>
			<div
				className='flex flex-wrap gap-2'
				role='group'
				aria-label='Stok raporu hazır filtreleri'
			>
				{presets.map((preset) => (
					<button
						type='button'
						key={preset.id}
						aria-pressed={
							view === preset.view &&
							(filters.movementType ?? 'all') === preset.movementType
						}
						onClick={() => {
							setView(preset.view);
							onChange({
								...filters,
								bayiName:
									preset.movementType === 'purchase'
										? filters.bayiName
										: undefined,
								movementType: preset.movementType,
							});
						}}
						className={`min-h-9 rounded-full border px-3 py-1 text-xs ${view === preset.view && (filters.movementType ?? 'all') === preset.movementType ? 'border-text bg-text text-bg' : 'border-border bg-button-bg hover:bg-button-hover-bg'}`}
					>
						{preset.label}
					</button>
				))}
			</div>
			<div className='flex flex-wrap items-end gap-3'>
				<label className='space-y-1 text-xs'>
					Hareket türü
					<select
						aria-label='Stok hareket türü'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.movementType ?? 'all'}
						onChange={(event) =>
							onChange({
								...filters,
								bayiName: undefined,
								movementType: event.target
									.value as StockFilters['movementType'],
							})
						}
					>
						<option value='all'>Tüm hareketler</option>
						<option value='purchase'>Alış girişleri</option>
						<option value='restock'>Tüm yenilemeler</option>
						<option value='complete'>Tam yenileme</option>
						<option value='partial'>Kısmi yenileme</option>
					</select>
				</label>
				<label className='space-y-1 text-xs'>
					Ürün türü
					<select
						aria-label='Rapor ürün türü'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.productType ?? ''}
						onChange={(event) =>
							onChange({
								...filters,
								productType:
									(event.target.value as StockFilters['productType']) ||
									undefined,
							})
						}
					>
						<option value=''>Tüm türler</option>
						{ORDER_PRODUCT_TYPE_ORDER.map((type) => (
							<option key={type} value={type}>
								{ORDER_PRODUCT_TYPES[type].label}
							</option>
						))}
					</select>
				</label>
				<label className='space-y-1 text-xs'>
					Hafıza boyutu
					<select
						aria-label='Rapor hafıza boyutu'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.memoryGb ?? ''}
						onChange={(event) =>
							onChange({
								...filters,
								memoryGb: event.target.value
									? Number(event.target.value)
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
				<label className='space-y-1 text-xs'>
					Görünüm
					<select
						aria-label='Stok raporu görünümü'
						className={`${STOCK_CONTROL} w-auto!`}
						value={view}
						onChange={(event) => setView(event.target.value as typeof view)}
					>
						<option value='movements'>Hareket kayıtları</option>
						<option value='profits'>Gerçekleşen kâr</option>
					</select>
				</label>
				{view === 'profits' && (
					<label className='space-y-1 text-xs'>
						Gruplama
						<select
							aria-label='Kâr gruplaması'
							className={`${STOCK_CONTROL} w-auto!`}
							value={groupBy}
							onChange={(event) =>
								setGroupBy(event.target.value as typeof groupBy)
							}
						>
							<option value='product'>Ürün türü + hafıza boyutu</option>
							<option value='memory'>Hafıza boyutu · tüm bellek tipleri</option>
						</select>
					</label>
				)}
			</div>
			<p className='text-xs text-text/70'>
				Tarih ve tutar, alışın veya yenilemenin toplamına uygulanır. Ürün ve
				boyut seçimi işlemin ilgili satırlarını gösterir. Bayi seçimi alış
				girişlerini gösterir; yenilemeler belirli bir bayiye ait değildir.
				Güncel stok ve fiyat ortalamaları rapor filtrelerinden bağımsızdır.
			</p>
			{loading && (
				<p role='status' className='text-xs text-text/70'>
					Stok raporu güncelleniyor...
				</p>
			)}
			{data && (
				<>
					<div
						className='flex flex-wrap gap-3 rounded-lg border border-border p-3 text-xs'
						aria-label='Stok raporu toplamları'
					>
						<span>
							Alış toplamı: {money(data.reportTotals?.purchaseCost ?? 0)}
						</span>
						<span>Satış geliri: {money(data.reportTotals?.revenue ?? 0)}</span>
						<span>
							Gerçekleşen kâr: {money(data.reportTotals?.profit ?? 0)}
						</span>
					</div>
					{view === 'profits' ? (
						<>
							<p className='text-xs text-text/70'>
								Kâr, kaydedilen satış gelirinden işlem anında sabitlenen maliyet
								çıkarılarak hesaplanır. Ortalamalar miktarla ağırlıklandırılır;
								farklı birimler birleştirilmez.
							</p>
							{!sortedProfits.length && (
								<p className='text-sm text-text/70'>
									Bu filtrelerle kayıtlı satış yok.
								</p>
							)}
							<div className='grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
								{sortedProfits.map((row, index) => (
									<details
										open
										key={`${row.type}:${row.memoryGb}:${row.quantityUnit}`}
										className='min-w-0 space-y-3 rounded-xl border border-border p-3'
									>
										<AdminSummary index={index}>
											{row.type === null
												? `${row.memoryGb} GB · Tüm bellek tipleri`
												: formatOrderProduct({
														type: row.type,
														memoryGb: row.memoryGb,
													})}
											{row.quantityUnit !== 'piece' &&
												` · ${ORDER_QUANTITY_UNIT_LABELS[row.quantityUnit]}`}
										</AdminSummary>
										<dl className='grid grid-cols-2 gap-3 text-xs'>
											{[
												[
													'Satılan miktar',
													`${quantity(row.quantity)} ${ORDER_QUANTITY_UNIT_LABELS[row.quantityUnit]}`,
												],
												[
													'Ortalama gerçek alış fiyatı',
													money(row.averagePurchaseCost),
												],
												[
													'Ortalama gerçek satış fiyatı',
													money(row.averageSellingPrice),
												],
												['Satış geliri', money(row.revenue)],
												['Satılan ürün maliyeti', money(row.costOfGoods)],
												['Gerçekleşen kâr', money(row.profit)],
												[
													'Kâr marjı',
													row.margin === null
														? '—'
														: `%${row.margin.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`,
												],
											].map(([label, value]) => (
												<div key={label} className='min-w-0'>
													<dt className='text-text/70'>{label}</dt>
													<dd className='mt-1 break-words font-medium'>
														{value}
													</dd>
												</div>
											))}
										</dl>
									</details>
								))}
							</div>
						</>
					) : (
						<>
							{!data.movements?.length && (
								<p className='text-sm text-text/70'>
									Filtrelere uygun stok hareketi yok.
								</p>
							)}
							<div className='grid min-w-0 gap-3 sm:grid-cols-2'>
								{data.movements?.map((row, index) => (
									<details
										key={row.id}
										className='min-w-0 space-y-3 rounded-xl border border-border p-3 text-sm'
									>
										<AdminSummary index={index}>
											<span className='min-w-0 break-words'>
												{formatOrderProduct(row)} · {kindLabels[row.kind]}
												{row.bayiName && ` · ${row.bayiName}`}
												<span className='mt-1 block text-xs text-text/70'>
													{new Date(row.createdAt).toLocaleString('tr-TR', {
														timeZone: 'Europe/Istanbul',
													})}{' '}
													· {quantity(row.quantity)}{' '}
													{ORDER_QUANTITY_UNIT_LABELS[row.quantityUnit]}
												</span>
											</span>
										</AdminSummary>
										<p>
											Miktar: {quantity(row.quantity)}{' '}
											{ORDER_QUANTITY_UNIT_LABELS[row.quantityUnit]}
										</p>
										<p>Alış maliyeti: {money(row.purchaseCost)}</p>
										<p>
											Ortalama gerçek alış fiyatı:{' '}
											{money(
												row.quantity > 0
													? row.purchaseCost / row.quantity
													: null,
											)}
										</p>
										{row.revenue !== null && (
											<>
												<p>
													Ortalama gerçek satış fiyatı:{' '}
													{money(
														row.quantity > 0
															? row.revenue / row.quantity
															: null,
													)}
												</p>
												<p>
													Satış geliri: {money(row.revenue)} · Kâr:{' '}
													{money(row.profit)}
												</p>
											</>
										)}
									</details>
								))}
							</div>
							<Pagination
								hideNavWhenSinglePage
								page={page}
								totalPages={data.movementPages ?? 1}
								pageSize={pageSize}
								onPageChange={onPageChange}
								onPageSizeChange={onPageSizeChange}
								summary={`${data.movementCount ?? 0} stok hareketi`}
							/>
						</>
					)}
				</>
			)}
		</details>
	);
}
