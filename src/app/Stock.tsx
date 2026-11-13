import { AdminPageHeading } from './component/admin/AdminPageHeading';
import { StockManagementPanel } from './component/admin/StockManagementPanel';

export default function StockPage() {
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:px-6 sm:py-6'>
			<AdminPageHeading title='Stok' />
			<StockManagementPanel />
		</main>
	);
}
