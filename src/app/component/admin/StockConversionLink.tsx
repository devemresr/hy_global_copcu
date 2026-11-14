import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
export function StockConversionLink() {
	return (
		<p className='mb-3 text-xs text-text/70'>
			Adet ve ağırlık arasında geçiş yapmak için{' '}
			<Link
				className='inline-flex items-center gap-1 font-medium text-text underline underline-offset-2 hover:text-text/75'
				to={PAGE_PATHS.STOCK + '#stock-unit-conversion'}
			>
				stok birimini dönüştürün
				<ArrowUpRight size={13} aria-hidden />
			</Link>
			.
		</p>
	);
}
