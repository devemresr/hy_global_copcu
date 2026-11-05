import { ORDER_PRODUCT_TYPE_ORDER } from '../constants/orderProducts.constant';

type Position = {
	type: (typeof ORDER_PRODUCT_TYPE_ORDER)[number];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	averagePurchaseCost: number | null;
};
export type StockSort =
	| 'type'
	| 'size-asc'
	| 'size-desc'
	| 'quantity-desc'
	| 'quantity-asc'
	| 'cost-desc'
	| 'cost-asc';
export function stockValue(position: Position) {
	return position.quantity === 0
		? 0
		: position.averagePurchaseCost === null
			? null
			: position.quantity * position.averagePurchaseCost;
}
export function compareStockProducts(
	a: Pick<Position, 'type' | 'memoryGb' | 'quantityUnit'>,
	b: Pick<Position, 'type' | 'memoryGb' | 'quantityUnit'>,
) {
	return (
		ORDER_PRODUCT_TYPE_ORDER.indexOf(a.type) -
			ORDER_PRODUCT_TYPE_ORDER.indexOf(b.type) ||
		(a.memoryGb ?? 0) - (b.memoryGb ?? 0) ||
		a.quantityUnit.localeCompare(b.quantityUnit)
	);
}
export function sortStockPositions<T extends Position>(
	positions: T[],
	sort: StockSort,
): T[] {
	return [...positions].sort((a, b) => {
		if (sort === 'type') return compareStockProducts(a, b);
		const value = (p: Position) =>
			sort.startsWith('cost')
				? stockValue(p)
				: sort.startsWith('size')
					? (p.memoryGb ?? 0)
					: p.quantity;
		const av = value(a);
		const bv = value(b);
		if (av === null || bv === null)
			return av === bv ? compareStockProducts(a, b) : av === null ? 1 : -1;
		return (
			(sort.endsWith('desc') ? bv - av : av - bv) || compareStockProducts(a, b)
		);
	});
}
export function summarizeStock(positions: Position[]) {
	const groups = new Map<
		string,
		{
			type: Position['type'];
			quantityUnit: Position['quantityUnit'];
			quantity: number;
			totalCost: number | null;
		}
	>();
	for (const p of positions) {
		const key = `${p.type}:${p.quantityUnit}`;
		const group = groups.get(key) ?? {
			type: p.type,
			quantityUnit: p.quantityUnit,
			quantity: 0,
			totalCost: 0,
		};
		group.quantity += p.quantity;
		const value = stockValue(p);
		group.totalCost =
			value === null || group.totalCost === null
				? null
				: group.totalCost + value;
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) =>
		compareStockProducts({ ...a, memoryGb: null }, { ...b, memoryGb: null }),
	);
}
