import { STOCK_CONTROL } from '../../constants/stockStyles.constant';
import type { StockFilters } from '../../hooks/api/endpoints/useStock';
export function StockReportFields({
	filters,
	onChange,
	view,
	setView,
	groupBy,
	setGroupBy,
}: {
	filters: StockFilters;
	onChange: (filters: StockFilters) => void;
	view: 'movements' | 'profits' | 'bayi';
	setView: (view: 'movements' | 'profits' | 'bayi') => void;
	groupBy: 'product' | 'memory';
	setGroupBy: (groupBy: 'product' | 'memory') => void;
}) {
	return (
		<>
			{' '}
			<div className='flex flex-wrap items-end gap-3'>
				<label className='space-y-1 text-xs'>
					Hareket türü
					<select
						aria-label='Stok hareket türü'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.movementType ?? 'all-movements'}
						onChange={(event) =>
							onChange({
								...filters,

								movementType: event.target
									.value as StockFilters['movementType'],
							})
						}
					>
						<option value='all-movements'>Tüm hareketler</option>
						<option value='all-sales'>Tüm satışlar</option>
						<option value='full-stock-sales'>Tüm stok satışı</option>
						<option value='partial-sales'>Kısmi satış</option>
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
						<option value='bayi'>Bayi bazlı analiz</option>
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
				Tarih ve işlem toplamı, alışın veya satışın tamamına uygulanır. Diğer
				sayısal alanlar ürün satırlarını filtreler. Ürün ve boyut seçimi işlemin
				ilgili satırlarını gösterir. Bayi filtresi alışları ve bayi dağılımı
				kayıtlı satışları gösterir. Gün toplamları tüm sayfalardaki filtrelenmiş
				kayıtları kapsar. Ortalama gerçek satış fiyatı seçili filtrelere uyan
				satışlardan hesaplanır.
			</p>
		</>
	);
}
