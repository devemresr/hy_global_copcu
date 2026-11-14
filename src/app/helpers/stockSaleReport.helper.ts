import { compareProductChoices } from './purchaseChoices.helper';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
	StockFilters,
	StockResponse,
	SupplierProfit,
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
import { reportFilterSummary } from './reportFilterSummary.helper';
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

	const supplierMap = new Map<
		string,
		{ key: string; name: string; rows: SupplierProfit[] }
	>();
	for (const row of data.profitsByBayi ?? []) {
		const key = row.bayiId ?? 'unlinked:' + row.bayiName;
		const group = supplierMap.get(key) ?? {
			key,
			name: row.currentBayiName || row.bayiName,
			rows: [],
		};
		group.rows.push(row);
		supplierMap.set(key, group);
	}
	const supplierGroups = [...supplierMap.values()].sort(
		(a, b) =>
			a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }) ||
			a.key.localeCompare(b.key),
	);
	function datedRows(group: (typeof supplierGroups)[number]) {
		const days = new Map<string, Map<string, SupplierProfit>>();
		for (const sale of data.reportSales ?? []) {
			const date = istanbulToday(new Date(sale.createdAt));
			for (const line of sale.lines) {
				for (const part of line.suppliers ?? []) {
					if ((part.bayiId ?? 'unlinked:' + part.bayiName) !== group.key)
						continue;
					const rows = days.get(date) ?? new Map<string, SupplierProfit>();
					const key = line.type + ':' + line.memoryGb + ':' + line.quantityUnit;
					const row = rows.get(key) ?? {
						...part,
						type: line.type,
						memoryGb: line.memoryGb,
						quantityUnit: line.quantityUnit,
						quantity: 0,
						revenue: 0,
						costOfGoods: 0,
						profit: 0,
						margin: null,
					};
					row.quantity += part.quantity;
					row.revenue += part.revenue;
					row.costOfGoods += part.costOfGoods;
					row.profit = row.revenue - row.costOfGoods;
					row.margin =
						row.revenue > 0 ? (row.profit / row.revenue) * 100 : null;
					rows.set(key, row);
					days.set(date, rows);
				}
			}
		}
		return days.size
			? [...days]
					.sort(([a], [b]) => b.localeCompare(a))
					.map(([date, rows]) => ({ date, rows: [...rows.values()] }))
			: [{ date: null, rows: group.rows }];
	}

	return {
		...PURCHASE_PDF_PAGE,
		info: { title, author: 'HY Global' },
		content: [
			{ text: title, fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
			{ text: 'Etkin filtreler', bold: true, margin: [0, 0, 0, 4] },
			...reportFilterSummary(filters, { bayiName: data.bayiFilterName }).map(
				(text) => ({
					text,
					fontSize: 9,
					margin: [0, 0, 0, 4] as [number, number, number, number],
				}),
			),
			{
				text: `Seçili filtrelere ve satış seçimine uyan ${data.selectedSaleCount ?? data.operations.length} satış dahildir. Ekran sayfalaması (pagination) raporu sınırlamaz.${includesPurchases ? ' Filtrelenen alışlar da rapora dahildir.' : ''}`,
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
				[...products]
					.sort(
						(a, b) =>
							compareProductChoices(a, b) ||
							a.quantityUnit.localeCompare(b.quantityUnit),
					)
					.map((row) => [
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
									'Kaynak bayi',
									'Satılan miktar',
									'Satış geliri',
									'Satılan mal maliyeti',
									'Brüt kâr',
								],
								[...sale.lines]
									.sort(
										(a, b) =>
											compareProductChoices(a, b) ||
											a.quantityUnit.localeCompare(b.quantityUnit),
									)
									.map((line) => [
										formatPurchaseProduct(line),
										(line.suppliers ?? [])
											.map((part) => {
												const name =
													supplierMap.get(
														part.bayiId ?? 'unlinked:' + part.bayiName,
													)?.name ?? part.bayiName;
												return (
													name +
													' (' +
													formatPurchaseQuantity(
														part.quantity,
														line.quantityUnit,
													) +
													')'
												);
											})
											.sort((a, b) => a.localeCompare(b, 'tr'))
											.join('\n') || '—',
										formatPurchaseQuantity(line.quantity, line.quantityUnit),
										formatPurchaseMoney(line.revenue),
										formatPurchaseMoney(line.costOfGoods),
										formatPurchaseMoney(line.revenue - line.costOfGoods),
									]),
							),
						]),
					]
				: []),
			...(supplierGroups.length
				? [
						{
							text: 'Bayi bazlı satış kârlılığı',
							headlineLevel: 1,
							fontSize: 13,
							bold: true,
							margin: [0, 18, 0, 8],
						} as import('pdfmake/interfaces').Content,
						...supplierGroups.flatMap((group) => [
							{
								text: 'Bayi: ' + group.name,
								fontSize: 12,
								bold: true,
								margin: [0, 12, 0, 6],
							} as import('pdfmake/interfaces').Content,
							...datedRows(group).flatMap((day) => [
								...(day.date
									? [
											{
												text: new Date(
													day.date + 'T12:00:00+03:00',
												).toLocaleDateString('tr-TR', {
													timeZone: 'Europe/Istanbul',
													dateStyle: 'long',
												}),
												fontSize: 10,
												bold: true,
												margin: [0, 8, 0, 4],
											} as import('pdfmake/interfaces').Content,
										]
									: []),
								purchasePdfTable(
									[
										'Ürün',
										'Miktar',
										'Satış geliri',
										'Satılan mal maliyeti',
										'Brüt kâr',
										'Marj',
									],
									[...day.rows]
										.sort(
											(a, b) =>
												compareProductChoices(a, b) ||
												a.quantityUnit.localeCompare(b.quantityUnit),
										)
										.map((row) => [
											formatPurchaseProduct(row) +
												(row.bayiName && group.name !== row.bayiName
													? '\nİşlem sırasında bayi: ' + row.bayiName
													: ''),
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
							]),
						]),
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
		`${!filters.movementType || filters.movementType === 'all-movements' || filters.movementType === 'purchase-entries' ? 'stok-hareketleri-raporu' : 'satis-raporu'}-${istanbulToday()}.pdf`,
	);
}
