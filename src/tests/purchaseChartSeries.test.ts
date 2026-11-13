import { describe, expect, it } from 'vitest';
import {
	dailyChartSeries,
	productChartSeries,
	memoryChartSeries,
} from '../app/helpers/purchaseChartSeries.helper';
import type { PurchasesResponse } from '../app/hooks/api/endpoints/usePurchases';

const data: PurchasesResponse = {
	orders: [],
	page: 1,
	totalPages: 1,
	summary: { count: 20, quantity: 99, total: 1000 },
	daily: [{ _id: '2026-11-05', count: 20, total: 1000 }],
	timeline: [
		{
			_id: 'full-report',
			name: 'Example',
			createdAt: '2026-11-04T22:00:00Z',
			total: 1000,
			quantity: 99,
			unitTotals: { piece: 99, kg: 1, g: 500 },
		},
	],
	byType: [],
	byMemory: [{ _id: 8, total: 140, quantity: 7 }],
	byTypeAndMemory: [
		{ type: 'EMCP', memoryGb: 16, quantity: 1, total: 40 },
		{ type: 'EMCP', memoryGb: 8, quantity: 2, total: 80 },
		{ type: 'EMMC', memoryGb: 8, quantity: 5, total: 60 },
		{ type: 'IPHONE', quantityUnit: 'kg', quantity: 1, total: 100 },
		{ type: 'IPHONE', quantityUnit: 'g', quantity: 500, total: 100 },
	],
};
describe('report chart measures', () => {
	it('keeps each type and size separate and orders sizes numerically', () => {
		expect(
			productChartSeries(data, 'total').map((row) => [row.label, row.value]),
		).toEqual([
			['eMMC – 8 GB', 60],
			['eMCP – 8 GB', 80],
			['eMCP – 16 GB', 40],
			['iPhone', 200],
		]);
	});
	it('uses weighted prices and converts weight units without mixing pieces', () => {
		expect(
			productChartSeries(data, 'averageKg').map((row) => row.value),
		).toEqual([200 / 1.5]);
		expect(productChartSeries(data, 'g').map((row) => row.value)).toEqual([
			1500,
		]);
		expect(productChartSeries(data, 'piece').map((row) => row.value)).toEqual([
			5, 2, 1,
		]);
		expect(memoryChartSeries(data, 'averagePiece')[0].value).toBe(20);
	});
	it('uses all report timeline records and Istanbul dates for daily quantities', () => {
		expect(dailyChartSeries(data, 'kg')[0].value).toBe(1.5);
		expect(dailyChartSeries(data, 'piece')[0].value).toBe(99);
		expect(dailyChartSeries(data, 'count')[0].value).toBe(20);
	});
});
