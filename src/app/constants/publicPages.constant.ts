// Public routes (see App.tsx) a page notice can be targeted at.
export const PUBLIC_PAGES = [
	{ path: '/', label: 'Ana sayfa (Ürünler)' },
	{ path: '/fiyatlandirma', label: 'Fiyatlandırma' },
	{ path: '/paymentCalculation', label: 'Ödeme hesaplama' },
	{ path: '/bilgi', label: 'Kaynaklar' },
	{ path: '/hakkimizda', label: 'Hakkımızda' },
	{ path: '/terms', label: 'Şartlar' },
] as const;
