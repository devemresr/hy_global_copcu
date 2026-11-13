import {
	PURCHASE_PDF_PAGE,
	purchasePdfTable,
	pdfWrapText,
} from './purchasePdfLayout.helper';
// import { pdfChartsSection } from './pdfCharts.helper';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
	Purchase,
	PurchasesResponse,
} from '../hooks/api/endpoints/usePurchases';
import { formatPurchaseMoney } from '../constants/purchaseReports.constant';
import { istanbulToday } from './purchasePeriod.helper';
import type { PurchaseChartImage } from './purchaseReport.helper';
import { downloadPdf } from './pdf.helper';
import { PURCHASE_PRODUCT_TYPES } from '../constants/purchaseProducts.constant';
import {
	formatPurchaseProduct,
	formatPurchaseQuantity,
	formatPurchaseUnitTotals,
	sumPurchaseUnits,
} from './purchaseProduct.helper';

export function singlePurchaseReport(order: Purchase): PurchasesResponse {
	const byType: PurchasesResponse['byType'] = [];
	const byMemory: PurchasesResponse['byMemory'] = [];
	for (const line of order.lines) {
		let type = byType.find((group) => group._id === line.type);
		if (!type) {
			type = {
				_id: line.type,
				total: 0,
				quantity: 0,
				unitTotals: { piece: 0, kg: 0, g: 0 },
			};
			byType.push(type);
		}
		type.total += line.total;
		const unit = line.quantityUnit ?? 'piece';
		if (unit === 'piece') type.quantity += line.quantity;
		type.unitTotals![unit] =
			Math.round((type.unitTotals![unit] + line.quantity) * 1000) / 1000;
		if (
			unit === 'piece' &&
			(line.requiresMemorySize ??
				PURCHASE_PRODUCT_TYPES[line.type].requiresMemorySize) &&
			typeof line.memoryGb === 'number'
		) {
			let memory = byMemory.find((group) => group._id === line.memoryGb);
			if (!memory) {
				memory = { _id: line.memoryGb, total: 0, quantity: 0 };
				byMemory.push(memory);
			}
			memory.total += line.total;
			memory.quantity += line.quantity;
		}
	}
	return {
		orders: [order],
		page: 1,
		totalPages: 1,
		summary: {
			count: 1,
			total: order.total,
			quantity: order.quantity,
			unitTotals: order.unitTotals ?? sumPurchaseUnits(order.lines),
		},
		daily: [
			{
				_id: istanbulToday(new Date(order.createdAt)),
				count: 1,
				total: order.total,
			},
		],
		byTypeAndMemory: order.lines,
		byType,
		byMemory: byMemory.sort((a, b) => a._id - b._id),
		adjustments: order.lines
			.filter(
				(line) =>
					typeof line.originalUnitPrice === 'number' &&
					line.originalUnitPrice !== line.unitPrice,
			)
			.map((line) => ({
				orderId: order._id,
				orderName: order.name || order._id,
				createdAt: order.createdAt,
				type: line.type,
				memoryGb: line.memoryGb,
				quantityUnit: line.quantityUnit,
				requiresMemorySize: line.requiresMemorySize,
				quantity: line.quantity,
				originalUnitPrice: line.originalUnitPrice!,
				unitPrice: line.unitPrice,
				priceAdjustment:
					line.priceAdjustment ??
					Math.round((line.unitPrice - line.originalUnitPrice!) * 100) / 100,
				totalAdjustment:
					Math.round(
						(line.unitPrice - line.originalUnitPrice!) * line.quantity * 100,
					) / 100,
			})),
	};
}

export function singlePurchaseDocument(
	order: Purchase,
	_charts: PurchaseChartImage[],
): TDocumentDefinitions {
	const signedMoney = (amount: number) =>
		`${amount > 0 ? '+' : ''}${formatPurchaseMoney(amount)}`;
	const adjustments = (singlePurchaseReport(order).adjustments ?? []).filter(
		(line) => line.unitPrice > line.originalUnitPrice,
	);
	const missingListPrice = order.lines.some(
		(line) => line.originalUnitPrice == null,
	);
	const details: Content = {
		stack: [
			purchasePdfTable(
				['Ürün', 'Miktar', 'Alış fiyatı', 'Birim fiyat', 'Tutar'],
				order.lines.map((line) => [
					formatPurchaseProduct(line),
					formatPurchaseQuantity(line.quantity, line.quantityUnit),
					line.originalUnitPrice == null
						? '*'
						: `${formatPurchaseMoney(line.originalUnitPrice)}`,
					`${formatPurchaseMoney(line.unitPrice)}${line.originalUnitPrice == null ? ' *' : ''}`,
					formatPurchaseMoney(line.total),
				]),
				[1.8, 0.85, 1.4, 1.4, 1.6],
			),
		],
		margin: [0, 16, 0, 12],
	};
	return {
		...PURCHASE_PDF_PAGE,
		info: { title: order.name || order._id, author: 'HY Global' },
		content: [
			{
				text: 'Alış özeti',
				fontSize: 12,
				color: '#555555',
				margin: [0, 0, 0, 6],
			},
			{ text: pdfWrapText(order.name || order._id), fontSize: 20, bold: true },
			{ text: `Alış kimliği: ${order._id}`, margin: [0, 8, 0, 4] },
			...(order.bayiPhone
				? [
						{
							text: `Bayi telefonu: ${order.bayiPhone}`,
							margin: [0, 0, 0, 4],
						} satisfies Content,
					]
				: []),
			{
				text: `Tarih: ${new Date(order.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (İstanbul)`,
			},
			details,
			...(missingListPrice
				? [
						{
							text: '* alış fiyatı bulunmadığından bu ürünlerde fiyat farkı hesaplanamamıştır. Girilen birim fiyat kullanılmıştır.',
							fontSize: 9,
							color: '#555555',
							margin: [0, 0, 0, 10],
						} satisfies Content,
					]
				: []),
			{
				text: `Ürün miktarı: ${formatPurchaseUnitTotals({ quantity: order.quantity, unitTotals: order.unitTotals ?? sumPurchaseUnits(order.lines) })}`,
				fontSize: 11,
				margin: [0, 4, 0, 6],
			},
			{
				text: `Genel toplam: ${formatPurchaseMoney(order.total)}`,
				alignment: 'right',
				fontSize: 16,
				bold: true,
				margin: [0, 4, 0, 16],
			},
			...(adjustments.length
				? [
						{
							text: 'Bu alıştaki fiyat değişiklikleri',
							fontSize: 13,
							bold: true,
							margin: [0, 12, 0, 8],
						} satisfies Content,
						{
							text: 'Liste alış fiyatı, alış anındaki katalog fiyatıdır. Yalnızca bu fiyatın üzerindeki alış istisnaları gösterilir. Birim fark, gerçek alış fiyatı ile liste alış fiyatı arasındaki farktır.',
							color: '#555555',
							margin: [0, 0, 0, 8],
						} satisfies Content,
						purchasePdfTable(
							['Ürün', 'Miktar', 'Birim fark', 'Toplam fark'],
							adjustments.map((line) => [
								formatPurchaseProduct(line),
								formatPurchaseQuantity(line.quantity, line.quantityUnit),
								signedMoney(line.priceAdjustment),
								signedMoney(line.totalAdjustment),
							]),
							[1.5, 0.85, 1.2, 1.4],
						),
					]
				: []),
			// ...pdfChartsSection(charts), // Graphs temporarily disabled.
		],
		footer: (page, pages) => ({
			text: `${page} / ${pages}`,
			alignment: 'center',
			fontSize: 8,
		}),
	};
}

export function singlePurchaseFilename(order: Purchase) {
	const day = istanbulToday(new Date(order.createdAt));
	return `alis_${order._id}_${day}.pdf`;
}

export async function downloadSinglePurchasePdf(
	order: Purchase,
	charts: PurchaseChartImage[],
) {
	await downloadPdf(
		singlePurchaseDocument(order, charts),
		singlePurchaseFilename(order),
	);
}
