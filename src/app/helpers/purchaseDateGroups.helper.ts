import type { PurchasesResponse } from '../hooks/api/endpoints/usePurchases';
import { istanbulToday } from './purchasePeriod.helper';

export type DatedPurchase = NonNullable<PurchasesResponse['timeline']>[number];
export function groupPurchasesByDate(orders: DatedPurchase[]) {
	const groups = new Map<
		string,
		{ date: string; orders: DatedPurchase[]; total: number; quantity: number }
	>();
	for (const order of orders) {
		const date = istanbulToday(new Date(order.createdAt));
		let group = groups.get(date);
		if (!group) {
			group = { date, orders: [], total: 0, quantity: 0 };
			groups.set(date, group);
		}
		group.orders.push(order);
		group.total += order.total;
		group.quantity += order.quantity;
	}
	return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function calendarDays(month: string) {
	const first = new Date(`${month}-01T12:00:00Z`);
	const count = new Date(
		Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
	).getUTCDate();
	return {
		offset: (first.getUTCDay() + 6) % 7,
		dates: Array.from(
			{ length: count },
			(_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
		),
	};
}
export const purchaseDateLabel = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('tr-TR', {
		timeZone: 'Europe/Istanbul',
	});
