import { productDistribution } from './productDistribution.helper';
import { numericFilterLabel } from './numericFilters.helper';
import {
	PURCHASE_PDF_PAGE,
	purchasePdfTable,
} from './purchasePdfLayout.helper';
// import { pdfChartsSection } from './pdfCharts.helper';
// import { purchaseDatePdf } from './purchaseDatePdf.helper';
import type { PurchaseDateViewType } from '../constants/purchaseReports.constant';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
	PurchaseFilters,
	PurchasesResponse,
} from '../hooks/api/endpoints/usePurchases';
import { formatPurchaseMoney } from '../constants/purchaseReports.constant';
import { downloadPdf } from './pdf.helper';
import {
	purchaseReportFilename,
	purchaseReportRange,
} from './purchasePeriod.helper';
import {
	formatPurchaseProduct,
	formatPurchaseQuantity,
	formatPurchaseUnitTotals,
} from './purchaseProduct.helper';

export type PurchaseChartImage = {
	title: string;
	image: string;
	kind?: 'daily' | 'byType' | 'byMemory';
	view?: PurchaseDateViewType;
	legend?: { label: string; value: string; color: string }[];
};

export function purchaseReportDocument(
	data: PurchasesResponse,
	filters: PurchaseFilters,
	_charts: PurchaseChartImage[],
): TDocumentDefinitions {
	const range = purchaseReportRange(data, filters);
	const table = (
		title: string,
		headers: string[],
		rows: (string | number)[][],
		headerColor = '#eeeeee',
	): Content[] => [
		{
			text: title,
			headlineLevel: 1,
			fontSize: 13,
			bold: true,
			margin: [0, 18, 0, 8],
		},
		purchasePdfTable(
			headers,
			rows,
			headers.length === 6
				? [1.9, 0.7, 1.3, 1.3, 1.2, 1.4]
				: headers.map(() => 1),
			headerColor,
		),
	];
	const adjustments = data.adjustments ?? [];
	const missingListPrices = data.missingListPrices ?? [];
	const signedMoney = (value: number) =>
		`${value > 0 ? '+' : ''}${formatPurchaseMoney(value)}`;
	return {
		...PURCHASE_PDF_PAGE,
		info: { title: 'Alış raporu', author: 'HY Global' },
		content: [
			{
				text: 'Alış raporu',
				fontSize: 20,
				bold: true,
				margin: [0, 0, 0, 10],
			},
			{
				text: `Tarih: ${range.from} – ${range.until} (İstanbul)`,
				margin: [0, 0, 0, 4],
			},
			...(filters.bayiIds?.length || filters.bayiId || filters.bayiName
				? [
						{
							text: `Bayi: ${data.bayiFilterName ?? filters.bayiName ?? filters.bayiId}`,
							margin: [0, 0, 0, 4] as [number, number, number, number],
						},
					]
				: []),
			{
				text: `Alış tutarı: ${filters.minTotal === undefined ? 'Alt sınır yok' : formatPurchaseMoney(filters.minTotal)} – ${filters.maxTotal === undefined ? 'Üst sınır yok' : formatPurchaseMoney(filters.maxTotal)}`,
				margin: [0, 0, 0, 12],
			},
			{
				text: `${data.summary.count} alış · ${formatPurchaseUnitTotals(data.summary)} · ${formatPurchaseMoney(data.summary.total)}`,
				bold: true,
				fontSize: 12,
			},
			{
				text: `Genel toplam: ${formatPurchaseMoney(data.summary.total)}`,
				bold: true,
				fontSize: 16,
				margin: [0, 10, 0, 4],
			},
			/* Graph content temporarily disabled.
			...(charts.length
				? [
						{
							text: 'Özet ve grafikler rapora dahil edilen alışları kapsar. Tutar grafiği yalnızca işlem yapılan günleri gösterir.',
							color: '#555555',
							margin: [0, 8, 0, 12],
						} satisfies Content,
					]
				: []),
*/
			...(filters.numericFilters ?? []).map((filter) => ({
				text: numericFilterLabel(filter),
				margin: [0, 0, 0, 4] as [number, number, number, number],
			})),
			/* Graphs and date visualizations temporarily disabled.
			...pdfChartsSection(charts),
			...charts
				.filter((chart) => chart.kind === 'daily' && chart.view)
				.flatMap((chart) => purchaseDatePdf(data.timeline ?? [], chart.view!)),
*/
			...(missingListPrices.length
				? [
						...table(
							'alış fiyatı bulunmayan ürünler *',
							['Alış / Ürün', 'Miktar', 'Birim fiyat', 'Tutar'],
							missingListPrices.map((line) => [
								`${line.orderName}\n${formatPurchaseProduct(line)}`,
								formatPurchaseQuantity(line.quantity, line.quantityUnit),
								`${formatPurchaseMoney(line.unitPrice)} *`,
								formatPurchaseMoney(line.total),
							]),
						),
						{
							text: '* alış fiyatı bulunmadığından fiyat farkı hesaplanamamıştır. Girilen birim fiyat kullanılmıştır.',
							fontSize: 9,
							color: '#555555',
							margin: [0, 8, 0, 12],
						} satisfies Content,
					]
				: []),
			{
				text: 'Alışa özel fiyat değişiklikleri',
				fontSize: 13,
				bold: true,
				margin: [0, 18, 0, 8],
			},
			{
				text: 'Alış fiyatı, alış kaydedildiği andaki fiyattır. Birim fark = uygulanan fiyat − alış fiyatı. Toplam fark = birim fark × miktar. Bu kayıtlar güncel fiyat listesi değişse de korunur.',
				color: '#555555',
				margin: [0, 0, 0, 8],
			},
			...(adjustments.length
				? table(
						'Fiyat değişikliği dökümü',
						[
							'Alış / Ürün',
							'Miktar',
							'Alış fiyatı',
							'Uygulanan birim fiyat',
							'Birim fark',
							'Toplam fark',
						],
						adjustments.map((row) => [
							`${row.orderName}\n${new Date(row.createdAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n${formatPurchaseProduct(row)}`,
							formatPurchaseQuantity(row.quantity, row.quantityUnit),
							`${formatPurchaseMoney(row.originalUnitPrice)}`,
							formatPurchaseMoney(row.unitPrice),
							signedMoney(row.priceAdjustment),
							signedMoney(row.totalAdjustment),
						]),
						'#eeeeee',
					)
				: [
						{
							text: 'Seçili alışlarda fiyat değişikliği kaydı yok.',
							color: '#666666',
						},
					]),
			...table(
				'Ürün türü dağılımı',
				['Ürün', 'Miktar', 'Tutar'],
				productDistribution(
					data.byTypeAndMemory ?? data.orders.flatMap((order) => order.lines),
				).map((row) => [
					formatPurchaseProduct(row),
					formatPurchaseQuantity(row.quantity, row.quantityUnit),
					formatPurchaseMoney(row.total),
				]),
			),
			...(data.byMemory.length
				? table(
						'Bellek dağılımı',
						['Bellek', 'Adet', 'Tutar'],
						data.byMemory.map((row) => [
							`${row._id} GB`,
							row.quantity,
							formatPurchaseMoney(row.total),
						]),
					)
				: []),
			...table(
				'Tarihlere göre toplamlar',
				['Tarih', 'Alış', 'Tutar'],
				data.daily.map((day) => [
					day._id,
					day.count,
					formatPurchaseMoney(day.total),
				]),
			),
		],
		footer: (page, pages) => ({
			text: `${page} / ${pages}`,
			alignment: 'center',
			fontSize: 8,
		}),
	};
}

export async function downloadPurchaseReport(
	data: PurchasesResponse,
	filters: PurchaseFilters,
	charts: PurchaseChartImage[],
) {
	await downloadPdf(
		purchaseReportDocument(data, filters, charts),
		purchaseReportFilename(data, filters),
	);
}
