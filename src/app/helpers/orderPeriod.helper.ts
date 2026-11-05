import type {
	OrderFilters,
	OrdersResponse,
} from '../hooks/api/endpoints/useOrders';
import type { ORDER_PERIOD_PRESETS } from '../constants/orderReports.constant';

export type OrderDateRange = { from: string; until: string };
type Preset = (typeof ORDER_PERIOD_PRESETS)[number]['id'];
export function istanbulToday(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Istanbul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const part = (type: string) =>
		parts.find((entry) => entry.type === type)!.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}
function shiftDay(date: string, days: number) {
	const value = new Date(`${date}T12:00:00Z`);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
}
export function orderMonthRange(year: number, month: number): OrderDateRange {
	const from = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`;
	const last = new Date(`${from}T12:00:00Z`);
	last.setUTCMonth(last.getUTCMonth() + 1, 0);
	return { from, until: last.toISOString().slice(0, 10) };
}
export function orderPresetRange(
	preset: Preset,
	now = new Date(),
): OrderDateRange {
	const today = istanbulToday(now);
	const [year, month] = today.split('-').map(Number);
	const monday = shiftDay(
		today,
		-((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7),
	);
	switch (preset) {
		case 'today':
			return { from: today, until: today };
		case 'yesterday': {
			const yesterday = shiftDay(today, -1);
			return { from: yesterday, until: yesterday };
		}
		case 'thisWeek':
			return { from: monday, until: today };
		case 'lastWeek':
			return { from: shiftDay(monday, -7), until: shiftDay(monday, -1) };
		case 'thisMonth':
			return { from: `${today.slice(0, 7)}-01`, until: today };
		case 'lastMonth':
			return orderMonthRange(
				month === 1 ? year - 1 : year,
				month === 1 ? 11 : month - 2,
			);
		case 'thisYear':
			return { from: `${year}-01-01`, until: today };
		case 'lastYear':
			return { from: `${year - 1}-01-01`, until: `${year - 1}-12-31` };
		case 'last7Days':
			return orderLastDaysRange(7, now);
		case 'last30Days':
			return orderLastDaysRange(30, now);
	}
}
export function orderLastDaysRange(
	days: number,
	now = new Date(),
): OrderDateRange {
	if (!Number.isSafeInteger(days) || days < 1 || days > 36500)
		throw new RangeError('Gün sayısı 1 ile 36500 arasında olmalıdır.');
	const today = istanbulToday(now);
	return { from: shiftDay(today, 1 - days), until: today };
}
export function orderRangeLabel(range: OrderDateRange): string {
	const format = (day: string) => day.split('-').reverse().join('.');
	return range.from === range.until
		? format(range.from)
		: `${format(range.from)} – ${format(range.until)}`;
}
export function orderReportRange(
	data: OrdersResponse,
	filters: OrderFilters,
): OrderDateRange {
	const from =
		filters.from ?? data.daily[0]?._id ?? filters.until ?? istanbulToday();
	return { from, until: filters.until ?? data.daily.at(-1)?._id ?? from };
}
export function orderReportFilename(
	data: OrdersResponse,
	filters: OrderFilters,
) {
	const { from, until } = orderReportRange(data, filters);
	return `alis-raporu_${from}${from === until ? '' : `_${until}`}.pdf`;
}
