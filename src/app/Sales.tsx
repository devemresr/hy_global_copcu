import { Link } from 'react-router';
import { useState } from 'react';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import { STOCK_BUTTON } from './constants/stockStyles.constant';
import { AdminPageHeading } from './component/admin/AdminPageHeading';
import { StockSaleForm } from './component/admin/StockSaleForm';
import { useStock } from './hooks/api/endpoints/useStock';
export default function SalesPage() {
	const stock = useStock({}, 1, 1);
	const [saved, setSaved] = useState(0);
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:space-y-6 sm:px-6 sm:py-6'>
			<AdminPageHeading title='Satış' />
			{stock.isPending && <p role='status'>Stok yükleniyor...</p>}
			{stock.isError && (
				<p role='alert'>
					Stok yüklenemedi: {stock.error.message}{' '}
					<button
						type='button'
						className='underline'
						onClick={() => void stock.refetch()}
					>
						Tekrar dene
					</button>
					{stock.error.status === 401 && (
						<Link to={PAGE_PATHS.LOGIN}>Giriş yap</Link>
					)}
				</p>
			)}
			{stock.data && (
				<StockSaleForm
					key={saved}
					positions={stock.data.positions}
					onSaved={() => setSaved((n) => n + 1)}
				/>
			)}
			<Link className={STOCK_BUTTON} to={PAGE_PATHS.ANALYSIS + '?preset=sales'}>
				Satış geçmişi ve raporlar · Analiz
			</Link>
		</main>
	);
}
