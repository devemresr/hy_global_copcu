import { describe, expect, it, vi } from 'vitest';
import {
	downloadSingleOrderPdf,
	singleOrderDocument,
	singleOrderReport,
} from '../app/helpers/singleOrderReport.helper';
import type { Order } from '../app/hooks/api/endpoints/useOrders';

const { download } = vi.hoisted(() => ({
	download: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../app/helpers/pdf.helper', () => ({ downloadPdf: download }));
const order: Order = {
	_id: 'order-1',
	name: 'Özel alış',
	createdAt: '2026-11-03T22:00:00Z',
	total: 560,
	quantity: 2,
	lines: [
		{
			type: 'EMMC',
			memoryGb: 64,
			quantity: 2,
			originalUnitPrice: 300,
			unitPrice: 280,
			priceAdjustment: -20,
			total: 560,
		},
	],
};
describe('saved order PDF', () => {
	it('prints weight units and no memory column for products that do not use memory', () => {
		const weighted: Order = {
			...order,
			quantity: 0,
			unitTotals: { piece: 0, kg: 1.25, g: 0 },
			total: 125,
			lines: [
				{
					type: 'IPHONE',
					memoryGb: null,
					requiresMemorySize: false,
					quantityUnit: 'kg',
					quantity: 1.25,
					unitPrice: 100,
					originalUnitPrice: null,
					total: 125,
				},
			],
		};
		const content = JSON.stringify(singleOrderDocument(weighted, []).content);
		expect(content).toContain('iPhone');
		expect(content).toContain('1,25 kg');
		expect(content).not.toContain(' GB');
		expect(singleOrderReport(weighted).byMemory).toEqual([]);
	});
	it('marks missing list prices with an asterisk and leaves differences uncalculated', () => {
		const missing: Order = {
			...order,
			lines: [
				{ ...order.lines[0], originalUnitPrice: null, priceAdjustment: null },
			],
		};
		const content = JSON.stringify(singleOrderDocument(missing, []).content);
		expect(content).toContain('* alış fiyatı bulunmadığından');
		expect(content).not.toContain('Bu alıştaki fiyat değişiklikleri');
		expect(singleOrderReport(missing).adjustments).toEqual([]);
	});
	it('uses only the saved order and preserves its price changes', () => {
		const report = singleOrderReport(order);
		expect(report.orders).toEqual([order]);
		expect(report.summary).toMatchObject({ count: 1, total: 560, quantity: 2 });
		expect(report.daily[0]._id).toBe('2026-11-04');
		expect(report.adjustments?.[0]).toMatchObject({
			originalUnitPrice: 300,
			unitPrice: 280,
			priceAdjustment: -20,
			totalAdjustment: -40,
		});
	});
	it('can download without charts while keeping order lines and price changes', async () => {
		await downloadSingleOrderPdf(order, []);
		const [document, filename] = download.mock.calls[0];
		const content = JSON.stringify(document.content);
		expect(content).toContain('Özel alış');
		expect(content).toContain('300,00');
		expect(content).toContain('280,00');
		expect(content).toContain(
			(-40).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
		);
		expect(content).not.toContain('data:image');
		for (const excluded of [
			'Alt sınır yok',
			'Üst sınır yok',
			'1 alış',
			'filtrelere uyan',
			'Günlük toplamlar',
		])
			expect(content).not.toContain(excluded);
		expect(content).toContain('Alış özeti');
		expect(filename).toBe('alis_order-1_2026-11-04.pdf');
	});
});
