import {
	ORDER_PRODUCT_TYPES,
	ORDER_QUANTITY_UNIT_LABELS,
	type OrderQuantityUnit,
	type OrderUnitTotals,
} from '../constants/orderProducts.constant';

type Product = {
	type: keyof typeof ORDER_PRODUCT_TYPES;
	memoryGb?: number | null;
	requiresMemorySize?: boolean;
};
export function formatOrderProduct(line: Product) {
	const product = ORDER_PRODUCT_TYPES[line.type];
	return `${product.label}${(line.requiresMemorySize ?? product.requiresMemorySize) && line.memoryGb != null ? ` – ${line.memoryGb === 1024 ? '1 TB' : `${line.memoryGb} GB`}` : ''}`;
}
export function formatOrderQuantity(
	quantity: number,
	quantityUnit: OrderQuantityUnit = 'piece',
) {
	return `${quantity.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} ${ORDER_QUANTITY_UNIT_LABELS[quantityUnit]}`;
}
export function formatOrderUnitTotals(data: {
	quantity: number;
	unitTotals?: OrderUnitTotals;
}) {
	const totals = data.unitTotals ?? { piece: data.quantity, kg: 0, g: 0 };
	return (
		(Object.keys(ORDER_QUANTITY_UNIT_LABELS) as OrderQuantityUnit[])
			.filter((unit) => totals[unit] > 0)
			.map((unit) => formatOrderQuantity(totals[unit], unit))
			.join(' · ') || '0 adet'
	);
}
export function sumOrderUnits(
	lines: { quantity: number; quantityUnit?: OrderQuantityUnit }[],
): OrderUnitTotals {
	const totals: OrderUnitTotals = { piece: 0, kg: 0, g: 0 };
	for (const line of lines) {
		const unit = line.quantityUnit ?? 'piece';
		totals[unit] = Math.round((totals[unit] + line.quantity) * 1000) / 1000;
	}
	return totals;
}
