import type { OrdersResponse } from '../hooks/api/endpoints/useOrders';
import { compareProductChoices } from './orderChoices.helper';
import { formatOrderProduct } from './orderProduct.helper';
import { istanbulToday } from './orderPeriod.helper';
import { formatOrderMoney } from '../constants/orderReports.constant';

export const CHART_METRICS = {
	total: 'Toplam tutar (TL)',
	count: 'Alış sayısı',
	piece: 'Miktar (adet)',
	kg: 'Miktar (kg)',
	g: 'Miktar (g)',
	averagePiece: 'Ortalama alış fiyatı (TL/adet)',
	averageKg: 'Ortalama alış fiyatı (TL/kg)',
	averageG: 'Ortalama alış fiyatı (TL/g)',
} as const;
export type ChartMetric = keyof typeof CHART_METRICS;
export type OrderChartSettings = {
	dailyMetric: ChartMetric;
	productMetric: ChartMetric;
	memoryMetric: ChartMetric;
	dateView: 'line' | 'bar' | 'calendar' | 'list';
	typesAsBar: boolean;
	memoryAsPie: boolean;
};
export const DAILY_METRICS: ChartMetric[] = [
	'total',
	'count',
	'piece',
	'kg',
	'g',
];
export const PRODUCT_METRICS: ChartMetric[] = [
	'total',
	'piece',
	'kg',
	'g',
	'averagePiece',
	'averageKg',
	'averageG',
];
export const MEMORY_METRICS: ChartMetric[] = ['total', 'piece', 'averagePiece'];
export function formatChartMetric(value: number, metric: ChartMetric) {
	if (metric === 'total') return formatOrderMoney(value);
	const number = value.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
	if (metric.startsWith('average'))
		return `${number} TL/${metric === 'averagePiece' ? 'adet' : metric === 'averageKg' ? 'kg' : 'g'}`;
	return `${number} ${metric === 'piece' ? 'adet' : metric === 'count' ? 'alış' : metric}`;
}
export function dailyChartSeries(data: OrdersResponse, metric: ChartMetric) {
	const totals = new Map<string, number>();
	if (metric !== 'total' && metric !== 'count')
		for (const order of data.timeline ?? []) {
			const day = istanbulToday(new Date(order.createdAt));
			const units = order.unitTotals ?? { piece: order.quantity, kg: 0, g: 0 };
			const quantity =
				metric === 'piece'
					? units.piece
					: metric === 'kg'
						? units.kg + units.g / 1000
						: units.g + units.kg * 1000;
			totals.set(day, (totals.get(day) ?? 0) + quantity);
		}
	return data.daily.map((day) => ({
		label: day._id,
		value:
			metric === 'total'
				? day.total
				: metric === 'count'
					? day.count
					: (totals.get(day._id) ?? 0),
	}));
}
export function productChartSeries(data: OrdersResponse, metric: ChartMetric) {
	const lines = data.byTypeAndMemory ?? [];
	const groups = new Map<
		string,
		{
			label: string;
			value: number;
			total: number;
			quantity: number;
			type: (typeof lines)[number]['type'];
			memoryGb?: number | null;
		}
	>();
	for (const line of [...lines].sort((a, b) =>
		compareProductChoices(
			{ ...a, memoryGb: a.memoryGb ?? null },
			{ ...b, memoryGb: b.memoryGb ?? null },
		),
	)) {
		const unit = line.quantityUnit ?? 'piece';
		const piece = metric === 'piece' || metric === 'averagePiece';
		const weight = ['kg', 'g', 'averageKg', 'averageG'].includes(metric);
		if ((piece && unit !== 'piece') || (weight && unit === 'piece')) continue;
		const key = `${line.type}:${line.memoryGb ?? '-'}`;
		let group = groups.get(key);
		if (!group) {
			group = {
				label: formatOrderProduct(line),
				value: 0,
				total: 0,
				quantity: 0,
				type: line.type,
				memoryGb: line.memoryGb,
			};
			groups.set(key, group);
		}
		const factor =
			metric === 'kg' || metric === 'averageKg'
				? unit === 'g'
					? 0.001
					: 1
				: metric === 'g' || metric === 'averageG'
					? unit === 'kg'
						? 1000
						: 1
					: 1;
		group.total += line.total;
		group.quantity += line.quantity * factor;
		group.value =
			metric === 'total'
				? group.total
				: metric.startsWith('average')
					? group.quantity > 0
						? group.total / group.quantity
						: 0
					: group.quantity;
	}
	return [...groups.values()];
}
export function memoryChartSeries(data: OrdersResponse, metric: ChartMetric) {
	return data.byMemory.map((row) => ({
		label: `${row._id} GB`,
		value:
			metric === 'total'
				? row.total
				: metric === 'averagePiece'
					? row.quantity > 0
						? row.total / row.quantity
						: 0
					: row.quantity,
	}));
}
