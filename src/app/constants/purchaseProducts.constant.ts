export const PURCHASE_MEMORY_SIZES = [
	8, 16, 32, 64, 128, 256, 512, 1024,
] as const;
export const PURCHASE_PRODUCT_TYPES = {
	EMMC: { label: 'eMMC', requiresMemorySize: true },
	EMCP: { label: 'eMCP', requiresMemorySize: true },
	IPHONE: { label: 'iPhone', requiresMemorySize: false },
	TABLET: { label: 'Tablet', requiresMemorySize: false },
} as const;
export const PURCHASE_PRODUCT_TYPE_ORDER = [
	'EMMC',
	'EMCP',
	'IPHONE',
	'TABLET',
] as const;
export const PURCHASE_TYPE_LABELS = {
	EMMC: 'eMMC',
	EMCP: 'eMCP',
	IPHONE: 'iPhone',
	TABLET: 'Tablet',
} as const;
export const PURCHASE_QUANTITY_UNIT_LABELS = {
	piece: 'adet',
	kg: 'kg',
	g: 'g',
} as const;
export type PurchaseQuantityUnit = keyof typeof PURCHASE_QUANTITY_UNIT_LABELS;
export type PurchaseUnitTotals = Record<PurchaseQuantityUnit, number>;
