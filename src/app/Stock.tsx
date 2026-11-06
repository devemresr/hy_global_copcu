import { Link } from 'react-router';
import { StockManagementPanel } from './component/admin/StockManagementPanel';
import { PAGE_PATHS } from './constants/pagePaths.constant';

export default function StockPage() {
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:px-6 sm:py-6'>
			<header className='flex flex-wrap items-center justify-between gap-3'>
				<h1 className='text-2xl font-semibold'>Stok</h1>
				<nav className='flex gap-4 text-sm underline'>
					<Link to={PAGE_PATHS.ADMIN}>Yönetim</Link>
					<Link to={PAGE_PATHS.ORDERS}>Alış</Link>
					<Link to={PAGE_PATHS.BALANCE}>Bakiye</Link>
				</nav>
			</header>
			<StockManagementPanel />
		</main>
	);
}
