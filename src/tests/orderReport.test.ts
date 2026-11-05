// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import {
	downloadOrderReport,
	orderReportDocument,
} from '../app/helpers/orderReport.helper';
import type { OrdersResponse } from '../app/hooks/api/endpoints/useOrders';
import { pdfChartsSection } from '../app/helpers/pdfCharts.helper';
import { ORDER_PDF_CONTENT_WIDTH } from '../app/helpers/orderPdfLayout.helper';
const { download } = vi.hoisted(() => ({
	download: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../app/helpers/pdf.helper', () => ({ downloadPdf: download }));

// Opaque RGB PNG: the browser PDF bundle needs Web Workers to decode alpha PNGs in Node.
const image =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC';
const report: OrdersResponse = {
	orders: [],
	summary: { count: 120, total: 24000, quantity: 240 },
	page: 1,
	totalPages: 120,
	byType: [{ _id: 'EMMC', quantity: 240, total: 24000 }],
	byMemory: [{ _id: 64, quantity: 240, total: 24000 }],
	daily: Array.from({ length: 120 }, (_, index) => ({
		_id: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
		total: 200,
		count: 1,
	})),
};
describe('order PDF report', () => {
	it('gives the daily chart a full-width row and pairs the remaining charts', () => {
		const section = pdfChartsSection([
			{ kind: 'daily', title: 'Daily totals', image },
			{ kind: 'byType', title: 'Types', image },
			{ kind: 'byMemory', title: 'Memory', image },
		]);
		expect(section).toHaveLength(3);
		expect(section[1]).toMatchObject({
			unbreakable: true,
			stack: [
				expect.objectContaining({
					table: expect.objectContaining({ widths: [ORDER_PDF_CONTENT_WIDTH] }),
				}),
				expect.objectContaining({ text: 'Daily totals' }),
			],
		});
		expect(section[2]).toMatchObject({
			columns: [
				expect.objectContaining({ width: (ORDER_PDF_CONTENT_WIDTH - 16) / 2 }),
				expect.objectContaining({ width: (ORDER_PDF_CONTENT_WIDTH - 16) / 2 }),
			],
		});
	});
	it('groups graphs in pairs under one heading with captions after each image', () => {
		const section = pdfChartsSection([
			{ title: 'Ürünler', image },
			{ title: 'Bellek', image },
		]);
		expect(section[0]).toMatchObject({ text: 'Grafikler' });
		expect(section[1]).toMatchObject({
			columns: [
				expect.objectContaining({
					stack: [
						expect.objectContaining({ table: expect.any(Object) }),
						expect.objectContaining({ text: 'Ürünler' }),
					],
				}),
				expect.objectContaining({
					stack: [
						expect.objectContaining({ table: expect.any(Object) }),
						expect.objectContaining({ text: 'Bellek' }),
					],
				}),
			],
		});
		expect(pdfChartsSection([])).toEqual([]);
	});
	it('omits the graph explanation when no charts are selected', () => {
		const content = JSON.stringify(orderReportDocument(report, {}, []).content);
		expect(content).not.toContain('Özet ve grafikler filtrelere uyan');
		expect(content).not.toContain('Tutar grafiği yalnızca');
	});
	it('documents the saved list price, applied price, unit change, and quantity-adjusted difference', () => {
		const document = orderReportDocument(
			{
				...report,
				adjustments: [
					{
						orderId: 'order-1',
						orderName: 'Özel fiyat',
						createdAt: '2026-11-04T12:00:00Z',
						type: 'EMMC',
						memoryGb: 64,
						quantity: 3,
						originalUnitPrice: 300,
						unitPrice: 280.5,
						priceAdjustment: -19.5,
						totalAdjustment: -58.5,
					},
				],
			},
			{},
			[],
		);
		const content = JSON.stringify(document.content).replaceAll('₺', '');
		for (const text of [
			'Özel fiyat',
			'300,00',
			'280,50',
			'-19,50',
			'-58,50',
			'Alış fiyatı',
			'Uygulanan birim fiyat',
			'Toplam fark',
		])
			expect(content).toContain(text);
	});
	it('downloads using the selected period in the actual filename', async () => {
		await downloadOrderReport(
			report,
			{ from: '2026-11-04', until: '2026-11-04' },
			[],
		);
		expect(download).toHaveBeenLastCalledWith(
			expect.any(Object),
			'alis-raporu_2026-11-04.pdf',
		);
		await downloadOrderReport(
			report,
			{ from: '2026-11-01', until: '2026-11-30' },
			[],
		);
		expect(download).toHaveBeenLastCalledWith(
			expect.any(Object),
			'alis-raporu_2026-11-01_2026-11-30.pdf',
		);
	});
	it('includes applied filters, full-result totals, and all chart images and breakdowns', () => {
		const document = orderReportDocument(
			report,
			{ from: '2026-01-01', until: '2026-04-30', minTotal: 0, maxTotal: 1000 },
			[
				{ title: 'Günlük', image },
				{ title: 'Ürün türü', image },
				{ title: 'Bellek', image },
			],
		);
		const content = JSON.stringify(document.content).replaceAll('₺', '');
		for (const value of [
			'2026-01-01',
			'2026-04-30',
			'120 alış',
			'240 adet',
			'24.000,00',
			'eMMC',
			'64 GB',
			'Alt sınır yok',
		]) {
			if (value === 'Alt sınır yok') expect(content).not.toContain(value);
			else expect(content).toContain(value);
		}
		expect(content.match(/data:image\/png/g)).toHaveLength(3);
		expect(content).toContain('0,00');
	});
	it('generates a valid multipage PDF containing chart images and embedded Turkish fonts', async () => {
		pdfMake.addVirtualFileSystem(fonts);
		const document = orderReportDocument(report, {}, [
			{ title: 'Tarihlere göre alış tutarı', image },
		]);
		const buffer = await pdfMake.createPdf(document).getBuffer();
		expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
		const body = buffer.toString('latin1');
		expect(body).toContain('/Subtype /Image');
		expect(body).toContain('/FontFile2');
		expect((body.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
	}, 20000);
});
