import { StockReport } from './StockReport';
import {
	orderDraftKey,
	readOrderDraft,
	saleDraftSchema,
} from '../../helpers/orderDraft.helper';
import { AdminSummary } from './AdminCollapseHeading';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
} from '../../constants/stockStyles.constant';
import { useState } from 'react';
import { Link } from 'react-router';
import {
	useStock,
	type StockFilters,
} from '../../hooks/api/endpoints/useStock';
import { StockSaleDialog } from './StockSaleDialog';
import {
	ORDER_PRODUCT_TYPES,
	ORDER_PRODUCT_TYPE_ORDER,
	ORDER_QUANTITY_UNIT_LABELS,
} from '../../constants/orderProducts.constant';
import {
	sortStockPositions,
	stockValue,
	summarizeStock,
	type StockSort,
} from '../../helpers/stockView.helper';
import { formatOrderProduct } from '../../helpers/orderProduct.helper';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';

const money = (value: number | null) =>
	value === null
		? '—'
		: value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const quantity = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
const button = STOCK_BUTTON;
const control = STOCK_CONTROL;

export function StockManagementPanel() {
	const [filters, setFilters] = useState<StockFilters>({});
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [saleOpen, setSaleOpen] = useState<boolean | null>(null);
	const [productType, setProductType] = useState<
		(typeof ORDER_PRODUCT_TYPE_ORDER)[number] | 'all'
	>('all');
	const [sort, setSort] = useState<StockSort>('type');
	const stock = useStock(filters, page, pageSize);
	const data = stock.data;
	const visiblePositions = sortStockPositions(
		(data?.positions ?? []).filter(
			(p) => productType === 'all' || p.type === productType,
		),
		sort,
	);
	const typeSummaries = summarizeStock(visiblePositions);
	return (
		<div className='mt-4 min-w-0 space-y-4'>
			<div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
				<p className='max-w-2xl text-sm text-text/80'>
					Kayıtlı alımlar otomatik olarak stok girişidir. Satış ve çıkışları
					buradan yönetin; bayi bilgileri alım geçmişinde korunur.
				</p>
				<div className='flex flex-wrap gap-2'>
					<Link className={button} to={PAGE_PATHS.ORDERS}>
						+ Alım / stok girişi ekle
					</Link>
					<button
						className={button}
						type='button'
						disabled={
							!data?.positions.some((p) => p.quantity > 0) ||
							stock.isFetching ||
							stock.isError
						}
						onClick={() => setSaleOpen(true)}
					>
						Satış
					</button>
				</div>
			</div>
			{stock.isPending && <p role='status'>Stok yükleniyor...</p>}
			{stock.isError && (
				<p role='alert' className='text-sm text-red-500'>
					Stok yüklenemedi: {stock.error.message}{' '}
					<button
						type='button'
						className='underline'
						onClick={() => void stock.refetch()}
					>
						Tekrar dene
					</button>
				</p>
			)}
			{data && (
				<>
					{(saleOpen ??
						Boolean(
							readOrderDraft(orderDraftKey('sale'), saleDraftSchema),
						)) && (
						<StockSaleDialog
							positions={data.positions}
							onClose={() => setSaleOpen(false)}
						/>
					)}
					<details open aria-label='Mevcut stok' className='space-y-3'>
						<AdminSummary index={0}>Mevcut stok · Tüm bayiler</AdminSummary>
						<p className='text-xs text-text/70'>
							Alım tarihi ve bayi filtreleri güncel stok toplamlarını
							değiştirmez. Maliyet aynı ürün ve boyut için tüm bayilerin
							ağırlıklı ortalamasıdır; adet ve ağırlık ayrı tutulur.
						</p>
						<div className='flex flex-wrap items-center justify-between gap-3'>
							<div
								role='group'
								aria-label='Stok ürün türü filtreleri'
								className='flex flex-wrap gap-1.5'
							>
								{(['all', ...ORDER_PRODUCT_TYPE_ORDER] as const).map((type) => (
									<button
										type='button'
										key={type}
										aria-pressed={productType === type}
										onClick={() => setProductType(type)}
										className={`min-h-10 rounded-full border px-3 py-1.5 text-sm sm:min-h-8 sm:px-2.5 sm:py-1 sm:text-xs ${productType === type ? 'border-text bg-text text-bg' : 'border-border bg-button-bg text-text hover:bg-button-hover-bg'}`}
									>
										{type === 'all' ? 'Tümü' : ORDER_PRODUCT_TYPES[type].label}
									</button>
								))}
							</div>
							<label className='flex items-center gap-2 text-xs'>
								Sırala
								<select
									aria-label='Stok sıralaması'
									value={sort}
									onChange={(event) => setSort(event.target.value as StockSort)}
									className={`${control} w-auto!`}
								>
									<option value='type'>Ürün türü ve boyut</option>
									<option value='size-asc'>
										Hafıza Boyutu · Küçükten büyüğe
									</option>
									<option value='size-desc'>
										Hafıza Boyutu · Büyükten küçüğe
									</option>
									<option value='quantity-desc'>Miktar · Çoktan aza</option>
									<option value='quantity-asc'>Miktar · Azdan çoğa</option>
									<option value='cost-desc'>
										Toplam maliyet · Yüksekten düşüğe
									</option>
									<option value='cost-asc'>
										Toplam maliyet · Düşükten yükseğe
									</option>
								</select>
							</label>
						</div>
						<div
							className='flex flex-wrap gap-2'
							aria-label='Ürün türü stok toplamları'
						>
							{typeSummaries.map((summary) => (
								<p
									key={`${summary.type}:${summary.quantityUnit}`}
									className='rounded-lg border border-border px-3 py-2 text-xs'
								>
									<span className='font-medium'>
										{ORDER_PRODUCT_TYPES[summary.type].label}
									</span>{' '}
									· {quantity(summary.quantity)}{' '}
									{ORDER_QUANTITY_UNIT_LABELS[summary.quantityUnit]} · Toplam
									maliyet: {money(summary.totalCost)}
								</p>
							))}
						</div>
						{!data.positions.length && (
							<p className='text-sm text-text/70'>
								Henüz stok girişi yok. İlk alımı ekleyin.
							</p>
						)}
						{data.positions.length > 0 && !visiblePositions.length && (
							<p className='text-sm text-text/70'>
								Bu ürün türünde stok kaydı yok.
							</p>
						)}
						<div className='grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
							{visiblePositions.map((p, index) => (
								<details
									open
									key={p.key}
									className='min-w-0 space-y-2 rounded-xl border border-border bg-button-bg/30 p-3'
								>
									<AdminSummary index={index}>
										<h4 className='font-medium'>{formatOrderProduct(p)}</h4>
									</AdminSummary>
									<p className='break-words text-xl font-semibold tabular-nums'>
										{quantity(p.quantity)}{' '}
										{ORDER_QUANTITY_UNIT_LABELS[p.quantityUnit]}
									</p>
									<p className='text-xs'>
										Liste alış fiyatı:{' '}
										{p.listPurchasePrices?.length
											? p.listPurchasePrices
													.map((price) =>
														price.unitPrice === null
															? 'Girilmedi'
															: price.unitPrice.toLocaleString('tr-TR', {
																	style: 'currency',
																	currency: price.currency,
																}) +
																(price.hasExceptions
																	? ' (modele göre istisnalar var)'
																	: ''),
													)
													.join(' / ')
											: 'Girilmedi'}
									</p>
									<p className='text-xs'>
										Ortalama gerçek alış fiyatı: {money(p.averagePurchaseCost)}{' '}
										/ {ORDER_QUANTITY_UNIT_LABELS[p.quantityUnit]}
									</p>
									<p className='text-xs'>
										Ortalama gerçek satış fiyatı:{' '}
										{money(p.averageSellingPrice ?? null)} /{' '}
										{ORDER_QUANTITY_UNIT_LABELS[p.quantityUnit]}
									</p>
									<p className='text-xs'>
										Toplam stok maliyeti: {money(stockValue(p))}
									</p>
								</details>
							))}
						</div>
					</details>
				</>
			)}
			<StockReport
				data={data}
				filters={filters}
				onChange={(next) => {
					setFilters(next);
					setPage(1);
				}}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(next) => {
					setPageSize(next);
					setPage(1);
				}}
				loading={stock.isFetching}
			/>
		</div>
	);
}

export function StockManagementSection() {
	const [open, setOpen] = useState(false);
	return (
		<details
			className='mb-4 min-w-0 rounded-2xl border border-border p-3 sm:p-4'
			open={open}
			onToggle={(event) => setOpen(event.currentTarget.open)}
		>
			<AdminSummary index={1}>
				Stok yönetimi · Stok, satış ve ürün türü kârlılığı
			</AdminSummary>
			{open && <StockManagementPanel />}
		</details>
	);
}
