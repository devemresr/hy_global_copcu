import {
	PURCHASE_PRODUCT_TYPES,
	PURCHASE_QUANTITY_UNIT_LABELS,
	type PurchaseQuantityUnit,
	type PurchaseUnitTotals,
} from '../constants/purchaseProducts.constant';

type Product = {
	type: keyof typeof PURCHASE_PRODUCT_TYPES;
	memoryGb?: number | null;
	requiresMemorySize?: boolean;
};
export function formatPurchaseProduct(line: Product) {
	const product = PURCHASE_PRODUCT_TYPES[line.type];
	return `${product.label}${(line.requiresMemorySize ?? product.requiresMemorySize) && line.memoryGb != null ? ` – ${line.memoryGb === 1024 ? '1 TB' : `${line.memoryGb} GB`}` : ''}`;
}
export function formatPurchaseQuantity(
	quantity: number,
	quantityUnit: PurchaseQuantityUnit = 'piece',
) {
	return `${quantity.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${PURCHASE_QUANTITY_UNIT_LABELS[quantityUnit]}`;
}
export function formatPurchaseUnitTotals(data: {
	quantity: number;
	unitTotals?: PurchaseUnitTotals;
}) {
	const totals = data.unitTotals ?? { piece: data.quantity, kg: 0, g: 0 };
	return (
		(Object.keys(PURCHASE_QUANTITY_UNIT_LABELS) as PurchaseQuantityUnit[])
			.filter((unit) => totals[unit] > 0)
			.map((unit) => formatPurchaseQuantity(totals[unit], unit))
			.join(' · ') || '0 adet'
	);
}
export function sumPurchaseUnits(
	lines: { quantity: number; quantityUnit?: PurchaseQuantityUnit }[],
): PurchaseUnitTotals {
	const totals: PurchaseUnitTotals = { piece: 0, kg: 0, g: 0 };
	for (const line of lines) {
		const unit = line.quantityUnit ?? 'piece';
		totals[unit] = Math.round((totals[unit] + line.quantity) * 1000) / 1000;
	}
	return totals;
}
