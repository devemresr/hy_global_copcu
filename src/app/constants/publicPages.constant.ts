import { PAGE_PATHS } from './pagePaths.constant';

// Public routes (see App.tsx) a page notice can be targeted at.
export const PUBLIC_PAGES = [
	{ path: PAGE_PATHS.HOME, label: 'Ana sayfa (Ürünler)' },
	{ path: PAGE_PATHS.PRICING, label: 'Fiyatlandırma' },
	{ path: PAGE_PATHS.PAYMENT_CALCULATION, label: 'Ödeme hesaplama' },
	{ path: PAGE_PATHS.INFO, label: 'Kaynaklar' },
	{ path: PAGE_PATHS.ABOUT, label: 'Hakkımızda' },
	{ path: PAGE_PATHS.TERMS, label: 'Şartlar' },
] as const;
