import type { OrdersResponse } from '../hooks/api/endpoints/useOrders';
import { istanbulToday } from './orderPeriod.helper';

export type DatedOrder = NonNullable<OrdersResponse['timeline']>[number];
export function groupOrdersByDate(orders: DatedOrder[]) {
	const groups = new Map<
		string,
		{ date: string; orders: DatedOrder[]; total: number; quantity: number }
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
export const orderDateLabel = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('tr-TR', {
		timeZone: 'Europe/Istanbul',
	});
