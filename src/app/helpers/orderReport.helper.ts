import { ORDER_PDF_PAGE, orderPdfTable } from './orderPdfLayout.helper';
import { pdfChartsSection } from './pdfCharts.helper';
import { orderDatePdf } from './orderDatePdf.helper';
import type { OrderDateViewType } from '../constants/orderReports.constant';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
	OrderFilters,
	OrdersResponse,
} from '../hooks/api/endpoints/useOrders';
import {
	ORDER_TYPE_LABELS,
	formatOrderMoney,
} from '../constants/orderReports.constant';
import { downloadPdf } from './pdf.helper';
import { orderReportFilename, orderReportRange } from './orderPeriod.helper';
import {
	formatOrderProduct,
	formatOrderQuantity,
	formatOrderUnitTotals,
} from './orderProduct.helper';

export type OrderChartImage = {
	title: string;
	image: string;
	kind?: 'daily' | 'byType' | 'byMemory';
	view?: OrderDateViewType;
	legend?: { label: string; value: string; color: string }[];
};

export function orderReportDocument(
	data: OrdersResponse,
	filters: OrderFilters,
	charts: OrderChartImage[],
): TDocumentDefinitions {
	const range = orderReportRange(data, filters);
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
		orderPdfTable(
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
		`${value > 0 ? '+' : ''}${formatOrderMoney(value)}`;
	return {
		...ORDER_PDF_PAGE,
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
			...(filters.bayiName
				? [
						{
							text: `Bayi: ${filters.bayiName}`,
							margin: [0, 0, 0, 4] as [number, number, number, number],
						},
					]
				: []),
			{
				text: `Alış tutarı: ${filters.minTotal === undefined ? 'Alt sınır yok' : formatOrderMoney(filters.minTotal)} – ${filters.maxTotal === undefined ? 'Üst sınır yok' : formatOrderMoney(filters.maxTotal)}`,
				margin: [0, 0, 0, 12],
			},
			{
				text: `${data.summary.count} alış · ${formatOrderUnitTotals(data.summary)} · ${formatOrderMoney(data.summary.total)}`,
				bold: true,
				fontSize: 12,
			},
			{
				text: `Genel toplam: ${formatOrderMoney(data.summary.total)}`,
				bold: true,
				fontSize: 16,
				margin: [0, 10, 0, 4],
			},
			...(charts.length
				? [
						{
							text: 'Özet ve grafikler rapora dahil edilen alışları kapsar. Tutar grafiği yalnızca işlem yapılan günleri gösterir.',
							color: '#555555',
							margin: [0, 8, 0, 12],
						} satisfies Content,
					]
				: []),
			...pdfChartsSection(charts),
			...charts
				.filter((chart) => chart.kind === 'daily' && chart.view)
				.flatMap((chart) => orderDatePdf(data.timeline ?? [], chart.view!)),
			...(missingListPrices.length
				? [
						...table(
							'alış fiyatı bulunmayan ürünler *',
							['Alış / Ürün', 'Miktar', 'Birim fiyat', 'Tutar'],
							missingListPrices.map((line) => [
								`${line.orderName}\n${formatOrderProduct(line)}`,
								formatOrderQuantity(line.quantity, line.quantityUnit),
								`${formatOrderMoney(line.unitPrice)} *`,
								formatOrderMoney(line.total),
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
							`${row.orderName}\n${new Date(row.createdAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n${formatOrderProduct(row)}`,
							formatOrderQuantity(row.quantity, row.quantityUnit),
							`${formatOrderMoney(row.originalUnitPrice)}`,
							formatOrderMoney(row.unitPrice),
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
				data.byType.map((row) => [
					ORDER_TYPE_LABELS[row._id] ?? row._id,
					formatOrderUnitTotals(row),
					formatOrderMoney(row.total),
				]),
			),
			...(data.byMemory.length
				? table(
						'Bellek dağılımı',
						['Bellek', 'Adet', 'Tutar'],
						data.byMemory.map((row) => [
							`${row._id} GB`,
							row.quantity,
							formatOrderMoney(row.total),
						]),
					)
				: []),
			...table(
				'Tarihlere göre toplamlar',
				['Tarih', 'Alış', 'Tutar'],
				data.daily.map((day) => [
					day._id,
					day.count,
					formatOrderMoney(day.total),
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

export async function downloadOrderReport(
	data: OrdersResponse,
	filters: OrderFilters,
	charts: OrderChartImage[],
) {
	await downloadPdf(
		orderReportDocument(data, filters, charts),
		orderReportFilename(data, filters),
	);
}
