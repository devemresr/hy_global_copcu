import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
	StockFilters,
	StockResponse,
} from '../hooks/api/endpoints/useStock';
import {
	PURCHASE_PDF_PAGE,
	purchasePdfTable,
} from './purchasePdfLayout.helper';
import {
	formatPurchaseProduct,
	formatPurchaseQuantity,
} from './purchaseProduct.helper';
import { formatPurchaseMoney } from '../constants/purchaseReports.constant';
import { numericFilterLabel } from './numericFilters.helper';
import { downloadPdf } from './pdf.helper';
import { istanbulToday } from './purchasePeriod.helper';

export function stockSaleReportDocument(
	data: StockResponse,
	filters: StockFilters,
): TDocumentDefinitions {
	const includesPurchases =
		!filters.movementType ||
		filters.movementType === 'all-movements' ||
		filters.movementType === 'purchase-entries';
	const title = includesPurchases ? 'Stok hareketleri raporu' : 'Satış raporu';
	const generatedAt = data.reportGeneratedAt ?? new Date().toISOString();
	const products =
		data.productSummary ??
		data.profits.flatMap((row) =>
			row.type === null
				? []
				: [
						{
							...row,
							type: row.type,
							purchaseQuantity: 0,
							purchaseTotal: 0,
							soldQuantity: row.quantity,
							currentQuantity:
								data.positions.find(
									(position) =>
										position.type === row.type &&
										position.memoryGb === row.memoryGb &&
										position.quantityUnit === row.quantityUnit,
								)?.quantity ?? 0,
							averagePurchasePrice: row.averagePurchaseCost,
							averageSellingPrice: row.averageSellingPrice,
						},
					],
		);

	return {
		...PURCHASE_PDF_PAGE,
		info: { title, author: 'HY Global' },
		content: [
			{ text: title, fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
			{
				text: `Dönem: ${filters.from ?? 'Başlangıç sınırı yok'} – ${filters.until ?? 'Bitiş sınırı yok'} (İstanbul)`,
			},
			{
				text: `Hareket: ${{ 'all-movements': 'Tüm hareketler', 'purchase-entries': 'Alışlar', 'all-sales': 'Tüm satışlar', 'full-stock-sales': 'Tam satışlar', 'partial-sales': 'Kısmi satışlar' }[filters.movementType ?? 'all-movements']}`,
			},
			...(filters.productType
				? [
						{
							text: `Ürün: ${formatPurchaseProduct({ type: filters.productType, memoryGb: filters.memoryGb })}`,
						},
					]
				: filters.memoryGb
					? [{ text: `Bellek: ${filters.memoryGb} GB` }]
					: []),
			...(filters.bayiIds?.length || filters.bayiId || filters.bayiName
				? [
						{
							text: `Bayi: ${data.bayiFilterName ?? filters.bayiName ?? filters.bayiId}`,
						},
					]
				: []),
			...(filters.numericFilters ?? []).map((filter) => ({
				text: numericFilterLabel(filter),
			})),
			...(filters.minTotal !== undefined || filters.maxTotal !== undefined
				? [
						{
							text: numericFilterLabel({
								field: 'total',
								min: filters.minTotal,
								max: filters.maxTotal,
							}),
						},
					]
				: []),
			{
				text: `Seçili filtrelere ve satış seçimine uyan ${data.selectedSaleCount ?? data.operations.length} satış dahildir. Ekran sayfalaması raporu sınırlamaz.${includesPurchases ? ' Filtrelenen alışlar da rapora dahildir.' : ''}`,
				color: '#555555',
				margin: [0, 8, 0, 12],
			},
			purchasePdfTable(
				[
					...(includesPurchases ? ['Alış tutarı'] : []),
					'Satış geliri',
					'Satılan mal maliyeti',
					'Gerçekleşen kâr',
				],
				[
					[
						...(includesPurchases
							? [formatPurchaseMoney(data.reportTotals.purchaseCost)]
							: []),
						formatPurchaseMoney(data.reportTotals.revenue),
						formatPurchaseMoney(
							data.reportTotals.costOfGoods ??
								data.profits.reduce((sum, row) => sum + row.costOfGoods, 0),
						),
						formatPurchaseMoney(data.reportTotals.profit),
					],
				],
			),
			{
				text: 'Ürün ve bellek bazlı alış / satış özeti',
				headlineLevel: 1,
				fontSize: 13,
				bold: true,
				margin: [0, 18, 0, 8],
			},
			purchasePdfTable(
				[
					'Ürün',
					'Alınan miktar',
					'Alış tutarı',
					'Satılan miktar',
					'Satış geliri',
					'Brüt kâr',
				],
				products.map((row) => [
					formatPurchaseProduct(row),
					formatPurchaseQuantity(row.purchaseQuantity, row.quantityUnit),
					formatPurchaseMoney(row.purchaseTotal),
					formatPurchaseQuantity(row.soldQuantity, row.quantityUnit),
					formatPurchaseMoney(row.revenue),
					formatPurchaseMoney(row.profit),
				]),
			),
			{
				text: 'Rapor anındaki stok ve gerçekleşen ortalama fiyatlar',
				fontSize: 13,
				bold: true,
				margin: [0, 18, 0, 8],
			},
			{
				text:
					'Stok görüntüleme zamanı: ' +
					new Date(generatedAt).toLocaleString('tr-TR', {
						timeZone: 'Europe/Istanbul',
					}) +
					' (İstanbul). Stok miktarı dönemden bağımsız güncel miktardır; seçili ürün ve bayileri kapsar.',
				fontSize: 9,
				margin: [0, 0, 0, 8],
			},
			{
				text: 'Ortalama alış = filtrelenen alış tutarı / alış miktarı. Ortalama satış = seçili satış geliri / satılan miktar. Ortalamalar miktarla ağırlıklandırılır; birimler ayrı tutulur. Brüt kâr, satış anında kaydedilen maliyetlerden hesaplanır.',
				fontSize: 9,
				margin: [0, 0, 0, 8],
			},
			purchasePdfTable(
				[
					'Ürün',
					'Rapor anındaki stok',
					'Ort. gerçekleşen alış',
					'Ort. gerçekleşen satış',
					'Brüt kâr marjı',
				],
				products.map((row) => [
					formatPurchaseProduct(row),
					formatPurchaseQuantity(row.currentQuantity, row.quantityUnit),
					row.averagePurchasePrice === null
						? '—'
						: formatPurchaseMoney(row.averagePurchasePrice) +
							' / ' +
							(row.quantityUnit === 'piece' ? 'adet' : row.quantityUnit),
					row.averageSellingPrice === null
						? '—'
						: formatPurchaseMoney(row.averageSellingPrice) +
							' / ' +
							(row.quantityUnit === 'piece' ? 'adet' : row.quantityUnit),
					row.margin === null
						? '—'
						: row.margin.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) +
							'%',
				]),
			),
			...((data.reportSales?.length ?? 0) > 0
				? [
						{
							text: 'Rapora dahil edilen satışlar',
							fontSize: 13,
							bold: true,
							margin: [0, 18, 0, 8],
						} as import('pdfmake/interfaces').Content,
						...data.reportSales!.flatMap((sale) => [
							{
								text:
									new Date(sale.createdAt).toLocaleString('tr-TR', {
										timeZone: 'Europe/Istanbul',
									}) +
									' · ' +
									sale.requestId,
								fontSize: 10,
								bold: true,
								margin: [0, 12, 0, 6],
							} as import('pdfmake/interfaces').Content,
							purchasePdfTable(
								[
									'Ürün',
									'Satılan miktar',
									'Satış geliri',
									'Satılan mal maliyeti',
									'Brüt kâr',
								],
								sale.lines.map((line) => [
									formatPurchaseProduct(line),
									formatPurchaseQuantity(line.quantity, line.quantityUnit),
									formatPurchaseMoney(line.revenue),
									formatPurchaseMoney(line.costOfGoods),
									formatPurchaseMoney(line.revenue - line.costOfGoods),
								]),
							),
						]),
					]
				: []),
			...((data.profitsByBayi?.length ?? 0) > 0
				? [
						{
							text: 'Bayi bazlı satış kârlılığı',
							headlineLevel: 1,
							fontSize: 13,
							bold: true,
							margin: [0, 18, 0, 8],
						} as import('pdfmake/interfaces').Content,
						purchasePdfTable(
							['Bayi / ürün', 'Miktar', 'Gelir', 'Maliyet', 'Kâr', 'Marj'],
							data.profitsByBayi!.map((row) => [
								(row.currentBayiName || row.bayiName) +
									(row.currentBayiName && row.currentBayiName !== row.bayiName
										? ' (İşlem sırasında: ' + row.bayiName + ')'
										: '') +
									'\n' +
									formatPurchaseProduct(row),
								formatPurchaseQuantity(row.quantity, row.quantityUnit),
								formatPurchaseMoney(row.revenue),
								formatPurchaseMoney(row.costOfGoods),
								formatPurchaseMoney(row.profit),
								row.margin === null
									? '—'
									: row.margin.toLocaleString('tr-TR', {
											maximumFractionDigits: 2,
										}) + '%',
							]),
						),
					]
				: []),
		],
		footer: (page, pages) => ({
			text: `${page} / ${pages}`,
			alignment: 'center',
			fontSize: 8,
		}),
	};
}

export async function downloadStockSaleReport(
	data: StockResponse,
	filters: StockFilters,
) {
	await downloadPdf(
		stockSaleReportDocument(data, filters),
		`satis-raporu-${istanbulToday()}.pdf`,
	);
}
