import { describe, expect, it } from 'vitest';
import type { ContentTable } from 'pdfmake/interfaces';
import {
	ORDER_PDF_CONTENT_WIDTH,
	ORDER_PDF_PAGE,
	orderPdfTable,
	pdfWrapText,
} from '../app/helpers/orderPdfLayout.helper';

describe('order PDF page bounds', () => {
	it('keeps six-column tables inside the printable width, including padding', () => {
		const result = orderPdfTable(
			['Ürün', 'GB', 'Adet', 'Liste', 'Birim', 'Toplam'],
			[
				[
					'EMMC',
					1024,
					1_000_000,
					'1.000.000,00 TL (elle girildi)',
					'1.000.000,00 TL',
					'1.000.000.000.000,00 TL',
				],
			],
			[1, 0.45, 0.65, 1.5, 1.4, 1.6],
		) as ContentTable;
		const widths = result.table.widths as number[];
		expect(
			widths.reduce((sum, width) => sum + width, 0) + 6 * 8,
		).toBeLessThanOrEqual(ORDER_PDF_CONTENT_WIDTH);
		expect(result.table.headerRows).toBe(1);
		expect(result.table.dontBreakRows).toBe(false);
		expect(result.table.keepWithHeaderRows).toBe(0);
	});
	it('wraps long identifiers without dropping their content', () => {
		const name = 'W'.repeat(120);
		const wrapped = pdfWrapText(name);
		expect(wrapped.split('\u200b').every((part) => part.length <= 12)).toBe(
			true,
		);
		expect(wrapped.replaceAll('\u200b', '')).toBe(name);
	});
	it('reserves space for the footer and moves orphan headings', () => {
		expect(ORDER_PDF_PAGE.pageMargins[3]).toBeGreaterThanOrEqual(44);
		expect(ORDER_PDF_PAGE.pageBreakBefore).toBeTypeOf('function');
	});
});
