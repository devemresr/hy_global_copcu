import { ORDER_TYPE_LABELS } from './orderProducts.constant';
export { ORDER_TYPE_LABELS } from './orderProducts.constant';
export const ORDER_CHART_COLORS = [
	'#059669',
	'#2563eb',
	'#d97706',
	'#9333ea',
	'#dc2626',
	'#0891b2',
	'#db2777',
	'#65a30d',
];
export const ORDER_CHART_PALETTES = {
	light: {
		background: '#ffffff',
		text: '#334155',
		grid: '#e2e8f0',
		tooltip: '#0f172a',
		series: ORDER_CHART_COLORS,
	},
	dark: {
		background: '#101e19',
		text: '#e2e8f0',
		grid: '#33473e',
		tooltip: '#243c31',
		series: [
			'#34d399',
			'#60a5fa',
			'#fbbf24',
			'#c084fc',
			'#f87171',
			'#22d3ee',
			'#f472b6',
			'#a3e635',
		],
	},
} as const;
export const ORDER_CHART_TITLES = {
	daily: 'Tarihlere göre alış tutarı',
	byType: 'Ürün türüne göre tutar',
	byMemory: 'Bellek boyutuna göre adet',
} as const;
export const ORDER_DATE_VIEWS = {
	calendar: 'Takvim',
	list: 'Tarihe göre liste',
} as const;
export type OrderDateViewType = keyof typeof ORDER_DATE_VIEWS;
export const orderTypeColorIndex = (type: keyof typeof ORDER_TYPE_LABELS) =>
	Object.keys(ORDER_TYPE_LABELS).indexOf(type);
export const orderMemoryColorIndex = (memoryGb: number) =>
	Math.log2(memoryGb) - 3;
export const formatOrderMoney = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
export const ORDER_MONTH_NAMES = [
	'Ocak',
	'Şubat',
	'Mart',
	'Nisan',
	'Mayıs',
	'Haziran',
	'Temmuz',
	'Ağustos',
	'Eylül',
	'Ekim',
	'Kasım',
	'Aralık',
];
export const ORDER_PERIOD_PRESETS = [
	{ id: 'today', label: 'Bugün' },
	{ id: 'yesterday', label: 'Dün' },
	{ id: 'thisWeek', label: 'Bu hafta' },
	{ id: 'lastWeek', label: 'Geçen hafta' },
	{ id: 'thisMonth', label: 'Bu ay' },
	{ id: 'lastMonth', label: 'Geçen ay' },
	{ id: 'thisYear', label: 'Bu yıl' },
	{ id: 'lastYear', label: 'Geçen yıl' },
	{ id: 'last7Days', label: 'Son 7 gün' },
	{ id: 'last30Days', label: 'Son 30 gün' },
] as const;
