import env from '../config/env';

const STAFF_BASE = `/${env.VITE_STAFF_PATH_PREFIX}`;

// Client-side page routes (App.tsx). API paths live in routes.constant.ts.
export const PAGE_PATHS = {
	HOME: '/',
	PRICING: '/fiyatlandirma',
	PAYMENT_CALCULATION: '/paymentCalculation',
	INFO: '/bilgi',
	ABOUT: '/hakkimizda',
	TERMS: '/terms',
	LOGIN: `${STAFF_BASE}/login`,
	ADMIN: `${STAFF_BASE}/admin`,
	ORDERS: `${STAFF_BASE}/admin/alis`,
	STOCK: `${STAFF_BASE}/admin/stok`,
	BALANCE: `${STAFF_BASE}/admin/bakiye`,
} as const;

// Staff-only pages - exempt from maintenance mode and analytics.
export const STAFF_PATH_PREFIXES = [STAFF_BASE];
