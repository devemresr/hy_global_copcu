// Client-side page routes (App.tsx). API paths live in routes.constant.ts.
export const PAGE_PATHS = {
	HOME: '/',
	PRICING: '/fiyatlandirma',
	PAYMENT_CALCULATION: '/paymentCalculation',
	INFO: '/bilgi',
	ABOUT: '/hakkimizda',
	TERMS: '/terms',
	LOGIN: '/login',
	ADMIN: '/admin',
} as const;

// Staff-only pages - exempt from maintenance mode and analytics.
export const STAFF_PATH_PREFIXES = [PAGE_PATHS.ADMIN, PAGE_PATHS.LOGIN];
