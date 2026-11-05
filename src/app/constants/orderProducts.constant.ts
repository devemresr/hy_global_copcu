export const ORDER_MEMORY_SIZES = [8, 16, 32, 64, 128, 256, 512, 1024] as const;
export const ORDER_PRODUCT_TYPES = {
	EMMC: { label: 'eMMC', requiresMemorySize: true },
	EMCP: { label: 'eMCP', requiresMemorySize: true },
	IPHONE: { label: 'iPhone', requiresMemorySize: false },
	TABLET: { label: 'Tablet', requiresMemorySize: false },
} as const;
export const ORDER_PRODUCT_TYPE_ORDER = [
	'EMMC',
	'EMCP',
	'IPHONE',
	'TABLET',
] as const;
export const ORDER_TYPE_LABELS = {
	EMMC: 'eMMC',
	EMCP: 'eMCP',
	IPHONE: 'iPhone',
	TABLET: 'Tablet',
} as const;
export const ORDER_QUANTITY_UNIT_LABELS = {
	piece: 'adet',
	kg: 'kg',
	g: 'g',
} as const;
export type OrderQuantityUnit = keyof typeof ORDER_QUANTITY_UNIT_LABELS;
export type OrderUnitTotals = Record<OrderQuantityUnit, number>;
