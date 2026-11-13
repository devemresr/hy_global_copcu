import { AdminSummary } from './AdminCollapseHeading';
import { PartyName } from './PartyName';
import { StockProductTag, StockQuantity } from './StockDisplay';
import type { SupplierProfit } from '../../hooks/api/endpoints/useStock';
const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
export function SupplierProfitReport({ rows }: { rows: SupplierProfit[] }) {
	return (
		<details open className='space-y-3 rounded-xl border border-border p-3'>
			<AdminSummary index={2}>Bayi bazlı satış kârlılığı</AdminSummary>
			<p className='text-xs text-text/70'>
				Miktar, gelir ve maliyet satış anında kaydedilen bayi dağılımından
				gelir. Kâr = gelir − maliyet; kâr marjı = kâr / gelir. Farklı birimler
				birleştirilmez.
			</p>
			{!rows.length && (
				<p className='text-sm text-text/70'>
					Seçili filtrelerde bayi dağılımı kayıtlı satış yok.
				</p>
			)}
			{rows.map((row, index) => (
				<details
					key={
						(row.bayiId ?? 'unlinked') +
						row.type +
						row.memoryGb +
						row.quantityUnit
					}
					className='space-y-2 rounded-xl border border-border p-2'
				>
					<AdminSummary index={index}>
						<span className='min-w-0 flex-1'>
							<PartyName
								label='Bayi'
								name={row.bayiName || 'Eşleştirilmemiş eski kayıt'}
								currentName={row.currentBayiName}
							/>
						</span>
						<StockProductTag type={row.type} memoryGb={row.memoryGb} />
					</AdminSummary>
					<dl className='grid gap-2 px-2 text-sm sm:grid-cols-2 lg:grid-cols-5'>
						{[
							[
								'Satılan miktar',
								<StockQuantity
									key='quantity'
									value={row.quantity.toLocaleString('tr-TR', {
										maximumFractionDigits: 6,
									})}
									unit={
										row.quantityUnit === 'piece' ? 'adet' : row.quantityUnit
									}
								/>,
							],
							['Satış geliri', money(row.revenue)],
							['Alış maliyeti', money(row.costOfGoods)],
							['Kâr', money(row.profit)],
							[
								'Kâr marjı',
								row.margin === null
									? '—'
									: row.margin.toLocaleString('tr-TR', {
											maximumFractionDigits: 2,
										}) + '%',
							],
						].map(([label, value]) => (
							<div
								key={String(label)}
								className='rounded-lg bg-button-bg/40 p-2'
							>
								<dt className='text-xs text-text/60'>{label}</dt>
								<dd className='mt-1 font-semibold tabular-nums'>{value}</dd>
							</div>
						))}
					</dl>
				</details>
			))}
		</details>
	);
}
