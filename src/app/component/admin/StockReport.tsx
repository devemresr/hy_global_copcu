import { BayiAnalysisReport } from './BayiAnalysisReport';
import { StockMovementHistory } from './StockMovementHistory';
import {
	Package,
	ShoppingCart,
	Banknote,
	TrendingUp,
	Coins,
} from 'lucide-react';
import { StockProductTag, StockMetric } from './StockDisplay';
import { STOCK_PRODUCT_COLORS } from '../../constants/stockPresentation.constant';
import { StockSellingPriceInfo } from './StockSellingPriceInfo';
import { AdminSummary } from './AdminCollapseHeading';
import {
	PURCHASE_PRODUCT_TYPE_ORDER,
	PURCHASE_QUANTITY_UNIT_LABELS,
} from '../../constants/purchaseProducts.constant';
import type {
	StockResponse,
	StockFilters,
} from '../../hooks/api/endpoints/useStock';
const money = (value: number | null) =>
	value === null
		? '—'
		: value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const quantity = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
export function StockReport({
	data,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	loading,
	view = 'movements',
	groupBy = 'product',
	filters = {},
	saleSelection,
}: {
	data?: StockResponse;
	saleSelection?: { excludedIds: string[]; onToggle: (id: string) => void };
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	loading: boolean;
	view?: 'movements' | 'profits' | 'bayi';
	filters?: StockFilters;
	groupBy?: 'product' | 'memory';
}) {
	const profits =
		(groupBy === 'memory' ? data?.profitsByMemory : data?.profits) ?? [];
	const sortedProfits = [...profits].sort(
		(a, b) =>
			(a.type === null ? 0 : PURCHASE_PRODUCT_TYPE_ORDER.indexOf(a.type)) -
				(b.type === null ? 0 : PURCHASE_PRODUCT_TYPE_ORDER.indexOf(b.type)) ||
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

			{loading && (
				<p role='status' className='text-xs text-text/70'>
					Stok raporu güncelleniyor...
				</p>
			)}
			{data && (
				<>
					<dl
						className='grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4'
						aria-label='Stok raporu toplamları'
					>
						<StockMetric
							label='Alış toplamı'
							value={money(data.reportTotals?.purchaseCost ?? 0)}
							tone='cost'
							icon={ShoppingCart}
						/>
						<StockMetric
							label='Satılan mal maliyeti'
							value={money(
								data.reportTotals?.costOfGoods ??
									data.profits.reduce((sum, row) => sum + row.costOfGoods, 0),
							)}
							tone='cost'
							icon={Coins}
						/>
						<StockMetric
							label='Satış geliri'
							value={money(data.reportTotals?.revenue ?? 0)}
							tone='income'
							icon={Banknote}
						/>
						<StockMetric
							label='Gerçekleşen kâr'
							value={money(data.reportTotals?.profit ?? 0)}
							tone={(data.reportTotals?.profit ?? 0) < 0 ? 'loss' : 'income'}
							icon={TrendingUp}
						/>
					</dl>
					<p className='text-xs text-text/70'>
						Gerçekleşen brüt kâr = satış geliri − satılan mal maliyeti. Alış
						toplamı, seçili dönemde kaydedilen stok girişlerini gösterir;
						dönemin kârından ayrıca düşülmez. Diğer gelir ve giderler Bakiye
						analizinde izlenir.
					</p>

					{view === 'bayi' ? (
						<BayiAnalysisReport
							rows={data.bayiReports ?? []}
							filters={filters}
						/>
					) : view === 'profits' ? (
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
										className={
											'min-w-0 space-y-3 rounded-xl border p-3 ' +
											(row.type
												? STOCK_PRODUCT_COLORS[row.type]
												: 'border-border')
										}
									>
										<AdminSummary index={index}>
											{row.type === null ? (
												`${row.memoryGb} GB · Tüm bellek tipleri`
											) : (
												<StockProductTag
													type={row.type}
													memoryGb={row.memoryGb}
												/>
											)}
											{row.quantityUnit !== 'piece' &&
												` · ${PURCHASE_QUANTITY_UNIT_LABELS[row.quantityUnit]}`}
										</AdminSummary>
										<dl className='grid min-w-0 grid-cols-2 gap-2'>
											<StockMetric
												label='Satılan miktar'
												value={
													quantity(row.quantity) +
													' ' +
													PURCHASE_QUANTITY_UNIT_LABELS[row.quantityUnit]
												}
												tone='quantity'
												icon={Package}
											/>
											<StockMetric
												label='Ortalama gerçek alış fiyatı'
												value={
													money(row.averagePurchaseCost) +
													' / ' +
													PURCHASE_QUANTITY_UNIT_LABELS[row.quantityUnit]
												}
												tone='cost'
												icon={ShoppingCart}
											/>
											<StockMetric
												label={
													<span className='inline-flex items-center gap-1'>
														Ortalama gerçek satış fiyatı{' '}
														<StockSellingPriceInfo />
													</span>
												}
												value={
													money(row.averageSellingPrice) +
													' / ' +
													PURCHASE_QUANTITY_UNIT_LABELS[row.quantityUnit]
												}
												tone='income'
												icon={Coins}
											/>
											<StockMetric
												label='Satış geliri'
												value={money(row.revenue)}
												tone='income'
												icon={Banknote}
											/>
											<StockMetric
												label='Satılan ürün maliyeti'
												value={money(row.costOfGoods)}
												tone='cost'
												icon={ShoppingCart}
											/>
											<StockMetric
												label='Gerçekleşen kâr'
												value={money(row.profit)}
												tone={row.profit < 0 ? 'loss' : 'income'}
												icon={TrendingUp}
											/>
											<StockMetric
												label='Kâr marjı'
												value={
													row.margin === null
														? '—'
														: '%' +
															row.margin.toLocaleString('tr-TR', {
																maximumFractionDigits: 2,
															})
												}
												tone={(row.margin ?? 0) < 0 ? 'loss' : 'income'}
												icon={TrendingUp}
											/>
										</dl>
									</details>
								))}
							</div>
						</>
					) : (
						<>
							<StockMovementHistory
								saleSelection={saleSelection}
								data={data}
								page={page}
								pageSize={pageSize}
								onPageChange={onPageChange}
								onPageSizeChange={onPageSizeChange}
							/>
						</>
					)}
				</>
			)}
		</details>
	);
}
