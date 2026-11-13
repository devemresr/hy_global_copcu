import { describe, expect, it } from 'vitest';
import {
	calendarDays,
	groupPurchasesByDate,
} from '../app/helpers/purchaseDateGroups.helper';
import { purchaseDatePdf } from '../app/helpers/purchaseDatePdf.helper';

const orders = [
	{
		_id: '1',
		name: 'Evening order',
		createdAt: '2026-11-03T21:30:00Z',
		total: 500,
		quantity: 2,
	},
	{
		_id: '2',
		name: 'Morning order',
		createdAt: '2026-11-04T06:00:00Z',
		total: 750,
		quantity: 3,
	},
];
describe('order date views', () => {
	it('groups by Istanbul date and totals every order', () => {
		expect(groupPurchasesByDate(orders)).toEqual([
			{ date: '2026-11-04', orders, total: 1250, quantity: 5 },
		]);
		expect(calendarDays('2024-02').dates).toHaveLength(29);
		expect(calendarDays('2026-11').offset).toBe(6);
	});
	it('prints calendar totals and full order details for the selected PDF view', () => {
		const calendar = JSON.stringify(purchaseDatePdf(orders, 'calendar'));
		expect(calendar).toContain('Alış takvimi');
		expect(calendar).toContain('1.250,00');
		for (const view of ['calendar', 'list'] as const) {
			const content = JSON.stringify(purchaseDatePdf(orders, view));
			expect(content).toContain('Evening order');
			expect(content).toContain('Morning order');
			expect(content).not.toContain('1–10 /');
		}
		expect(JSON.stringify(purchaseDatePdf(orders, 'list'))).not.toContain(
			'Alış takvimi',
		);
	});
});
