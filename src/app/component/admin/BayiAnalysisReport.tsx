import { useState } from 'react';
import {
	useStock,
	type BayiStockReport,
	type StockFilters,
} from '../../hooks/api/endpoints/useStock';
import { compareProductChoices } from '../../helpers/purchaseChoices.helper';
import { AdminSummary } from './AdminCollapseHeading';
import { StockMovementHistory } from './StockMovementHistory';
import { StockProductTag } from './StockDisplay';
import { PartyName } from './PartyName';
const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const number = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
function BayiHistory({
	bayiId,
	filters,
}: {
	bayiId: string;
	filters: StockFilters;
}) {
	const [open, setOpen] = useState(false);
	const [page, setPage] = useState(1),
		[pageSize, setPageSize] = useState(20);
	const query = useStock(
		{ ...filters, bayiIds: [bayiId], bayiId: undefined, bayiName: undefined },
		page,
		pageSize,
		open,
	);
	return (
		<details
			className='space-y-3'
			onToggle={(event) => setOpen(event.currentTarget.open)}
		>
			<AdminSummary index={1}>Bayinin alış ve satış hareketleri</AdminSummary>
			{open && query.isPending && <p role='status'>Hareketler yükleniyor...</p>}
			{open && query.isError && (
				<p role='alert'>
					{query.error.message}{' '}
					<button
						type='button'
						className='underline'
						onClick={() => void query.refetch()}
					>
						Tekrar dene
					</button>
				</p>
			)}
			{open && query.data && (
				<StockMovementHistory
					data={query.data}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={(size) => {
						setPageSize(size);
						setPage(1);
					}}
				/>
			)}
		</details>
	);
}
export function BayiAnalysisReport({
	rows,
	filters,
}: {
	rows: BayiStockReport[];
	filters: StockFilters;
}) {
	return (
		<div className='space-y-3' aria-label='Bayi bazlı analiz'>
			<p className='text-xs text-text/70'>
				Her bayinin alış girişleri, kendi stoklarından yapılan satışlar ve
				gerçekleşen brüt kârı seçili filtrelerle hesaplanır. Alış toplamı kârdan
				ayrıca düşülmez.
			</p>
			{!rows.length && <p>Seçili filtrelerde bayi hareketi yok.</p>}
			{rows.map((bayi, index) => (
				<details
					key={bayi.bayiId ?? bayi.bayiName}
					className='space-y-3 rounded-xl border border-border p-3'
				>
					<AdminSummary index={index}>
						<span className='min-w-0 flex-1'>
							<PartyName
								label='Bayi'
								name={bayi.bayiName}
								currentName={bayi.currentBayiName}
							/>
						</span>
						<span
							className={
								'text-sm ' + (bayi.profit < 0 ? 'stock-loss' : 'stock-income')
							}
						>
							Kâr: {money(bayi.profit)}
						</span>
					</AdminSummary>
					<dl className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
						{[
							['Alış toplamı', bayi.purchaseCost],
							['Satış geliri', bayi.revenue],
							['Satılan mal maliyeti', bayi.costOfGoods],
							['Gerçekleşen kâr', bayi.profit],
						].map(([label, value]) => (
							<div key={label} className='rounded-lg bg-button-bg/40 p-2'>
								<dt className='text-xs text-text/70'>{label}</dt>
								<dd className='mt-1 text-sm font-semibold'>
									{money(Number(value))}
								</dd>
							</div>
						))}
					</dl>
					{[...bayi.products]
						.sort(compareProductChoices)
						.map((product, productIndex) => (
							<details
								key={`${product.type}:${product.memoryGb}:${product.quantityUnit}`}
								className='space-y-2 rounded-lg border border-border p-2'
							>
								<AdminSummary index={productIndex}>
									<StockProductTag
										type={product.type}
										memoryGb={product.memoryGb}
									/>
									<span className='text-xs'>
										Alınan: {number(product.purchasedQuantity)} · Satılan:{' '}
										{number(product.soldQuantity)}{' '}
										{product.quantityUnit === 'piece'
											? 'adet'
											: product.quantityUnit}
									</span>
								</AdminSummary>
								<p className='flex flex-wrap gap-3 px-2 text-xs'>
									<span>Alış: {money(product.purchaseCost)}</span>
									<span>Satış: {money(product.revenue)}</span>
									<span>
										Satılan mal maliyeti: {money(product.costOfGoods)}
									</span>
									<span>Kâr: {money(product.profit)}</span>
									<span>
										Ortalama giriş fiyatı:{' '}
										{product.purchasedQuantity > 0
											? money(product.purchaseCost / product.purchasedQuantity)
											: '—'}
									</span>
									<span>
										Satılan stok birim maliyeti:{' '}
										{product.soldQuantity > 0
											? money(product.costOfGoods / product.soldQuantity)
											: '—'}
									</span>
									<span>
										Ortalama satış fiyatı:{' '}
										{product.soldQuantity > 0
											? money(product.revenue / product.soldQuantity)
											: '—'}
									</span>
									<span>
										Kâr marjı:{' '}
										{product.revenue > 0
											? (
													(product.profit / product.revenue) *
													100
												).toLocaleString('tr-TR', {
													maximumFractionDigits: 2,
												}) + '%'
											: '—'}
									</span>
								</p>
							</details>
						))}
					{bayi.bayiId && (
						<BayiHistory
							key={JSON.stringify(filters)}
							bayiId={bayi.bayiId}
							filters={filters}
						/>
					)}
				</details>
			))}
		</div>
	);
}
