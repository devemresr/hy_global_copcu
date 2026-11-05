import { formatOrderUnitTotals } from './orderProduct.helper';
import type { Content, TableCell } from 'pdfmake/interfaces';
import {
	calendarDays,
	groupOrdersByDate,
	orderDateLabel,
	type DatedOrder,
} from './orderDateGroups.helper';
import {
	ORDER_DATE_VIEWS,
	formatOrderMoney,
	type OrderDateViewType,
} from '../constants/orderReports.constant';
import {
	ORDER_PDF_CONTENT_WIDTH,
	orderPdfTable,
	pdfWrapText,
} from './orderPdfLayout.helper';

export function orderDatePdf(
	orders: DatedOrder[],
	view: OrderDateViewType,
): Content[] {
	const groups = groupOrdersByDate(orders);
	const result: Content[] = [];
	if (view === 'calendar') {
		const months = [...new Set(groups.map((group) => group.date.slice(0, 7)))];
		for (const month of months) {
			const { offset, dates } = calendarDays(month);
			const cells: TableCell[] = Array.from({ length: offset }, () => ({
				text: '',
			}));
			for (const date of dates) {
				const group = groups.find((entry) => entry.date === date);
				cells.push({
					stack: [
						{ text: Number(date.slice(-2)), bold: true, margin: [0, 0, 0, 4] },
						{ text: group ? `${group.orders.length} alış` : '—', fontSize: 8 },
						...(group
							? [
									{
										text: pdfWrapText(formatOrderMoney(group.total)),
										fontSize: 8,
										margin: [0, 4, 0, 0],
									} satisfies Content,
								]
							: []),
					],
					fillColor: group ? '#eeeeee' : '#ffffff',
				});
			}
			while (cells.length % 7) cells.push({ text: '' });
			const rows: TableCell[][] = [];
			for (let index = 0; index < cells.length; index += 7)
				rows.push(cells.slice(index, index + 7));
			result.push(
				{
					text: `Alış takvimi · ${new Date(`${month}-01T12:00:00Z`).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' })}`,
					headlineLevel: 1,
					bold: true,
					fontSize: 13,
					margin: [0, 16, 0, 8],
				},
				{
					fontSize: 9,
					table: {
						headerRows: 1,
						dontBreakRows: false,
						keepWithHeaderRows: 0,
						widths: Array.from(
							{ length: 7 },
							() => (ORDER_PDF_CONTENT_WIDTH - 56 - 4) / 7,
						),
						body: [
							['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((text) => ({
								text,
								bold: true,
							})),
							...rows,
						],
					},
					layout: {
						hLineWidth: () => 0.5,
						vLineWidth: () => 0.5,
						hLineColor: () => '#dddddd',
						vLineColor: () => '#dddddd',
						paddingLeft: () => 4,
						paddingRight: () => 4,
						paddingTop: () => 6,
						paddingBottom: () => 6,
					},
				},
			);
		}
	}
	if (!groups.length) return result;
	result.push({
		text: `Alış detayları · ${ORDER_DATE_VIEWS[view]}`,
		fontSize: 13,
		bold: true,
		headlineLevel: 1,
		margin: [0, 16, 0, 8],
	});
	// All orders appear together, grouped by date. PDF page flow provides safe
	// continuation without the screen's pagination or truncated chart labels.
	for (const group of groups) {
		result.push(
			{
				text: `${orderDateLabel(group.date)} · ${group.orders.length} alış · ${formatOrderMoney(group.total)}`,
				fontSize: 10,
				bold: true,
				headlineLevel: 1,
				margin: [0, 12, 0, 5],
			},
			orderPdfTable(
				['Alış', 'Miktar', 'Tutar'],
				group.orders.map((order) => [
					order.name || order._id,
					formatOrderUnitTotals(order),
					formatOrderMoney(order.total),
				]),
				[2.5, 0.6, 1.3],
			),
		);
	}
	return result;
}
