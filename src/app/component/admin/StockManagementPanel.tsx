import { StockPalettePicker } from './StockPalettePicker';
import { useState } from 'react';
import { Link } from 'react-router';
import { CurrentStockInventory } from './CurrentStockInventory';
import { AdminSummary } from './AdminCollapseHeading';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';
import { useStock } from '../../hooks/api/endpoints/useStock';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';

export function StockManagementPanel() {
	const stock = useStock({}, 1, 1);
	return (
		<div className='mt-4 min-w-0 space-y-4'>
			<div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
				<p className='max-w-2xl text-sm text-text/80'>
					Kayıtlı alımlar otomatik olarak stok girişidir. Satışları ayrı Satış
					sayfasından kaydedin; bayi bilgileri alım geçmişinde korunur.
				</p>
				<div className='flex flex-wrap gap-2'>
					<Link className={STOCK_BUTTON} to={PAGE_PATHS.PURCHASES}>
						+ Alım / stok girişi ekle
					</Link>
					<Link className={STOCK_BUTTON} to={PAGE_PATHS.SALES}>
						Satış
					</Link>
				</div>
			</div>
			<details className='space-y-3 rounded-xl border border-border p-3'>
				<AdminSummary index={0}>Görünüm seçenekleri</AdminSummary>
				<StockPalettePicker />
			</details>
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
			<Link className={STOCK_BUTTON} to={PAGE_PATHS.ANALYSIS + '?preset=stock'}>
				Stok hareketleri ve kârlılık · Analiz
			</Link>
			{stock.data && <CurrentStockInventory positions={stock.data.positions} />}
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
