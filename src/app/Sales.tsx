import { useState } from 'react';
import { Link } from 'react-router';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import { useStock, type StockFilters } from './hooks/api/endpoints/useStock';
import { StockSaleForm } from './component/admin/StockSaleForm';
import { StockReport } from './component/admin/StockReport';

export default function SalesPage() {
	const [filters, setFilters] = useState<StockFilters>({
		movementType: 'restock',
	});
	const [page, setPage] = useState(1),
		[pageSize, setPageSize] = useState(20);
	const [saved, setSaved] = useState(0);
	const stock = useStock(filters, page, pageSize);
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:space-y-6 sm:px-6 sm:py-6'>
			<header className='flex flex-wrap items-center justify-between gap-3'>
				<h1 className='text-2xl font-semibold'>Satış</h1>
				<nav className='flex flex-wrap gap-4 text-sm underline'>
					<Link to={PAGE_PATHS.ADMIN}>Yönetim</Link>
					<Link to={PAGE_PATHS.ORDERS}>Alış</Link>
					<Link to={PAGE_PATHS.STOCK}>Stok</Link>
					<Link to={PAGE_PATHS.BALANCE}>Bakiye</Link>
				</nav>
			</header>
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
				<>
					<StockSaleForm
						key={saved}
						positions={stock.data.positions}
						onSaved={() => setSaved((n) => n + 1)}
					/>
					<StockReport
						data={stock.data}
						filters={filters}
						onChange={(next) => {
							setFilters(next);
							setPage(1);
						}}
						page={page}
						pageSize={pageSize}
						onPageChange={setPage}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setPage(1);
						}}
						loading={stock.isFetching}
					/>
				</>
			)}
		</main>
	);
}
