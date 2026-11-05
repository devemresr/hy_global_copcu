import type { Content } from 'pdfmake/interfaces';
import type { OrderChartImage } from './orderReport.helper';
import { ORDER_CHART_TITLES } from '../constants/orderReports.constant';
import { ORDER_PDF_CONTENT_WIDTH, pdfWrapText } from './orderPdfLayout.helper';

export function pdfChartsSection(charts: OrderChartImage[]): Content[] {
	if (!charts.length) return [];
	const rows: Content[] = [];
	const halfWidth = (ORDER_PDF_CONTENT_WIDTH - 16) / 2;
	const tile = (
		{ title, image, legend = [] }: OrderChartImage,
		width: number,
		fullWidth = false,
	) => ({
		width,
		stack: [
			{
				table: {
					widths: [width],
					heights: [fullWidth ? 246 : 156],
					body: [
						[
							{
								image,
								fit: [width, fullWidth ? 240 : 150],
								alignment: 'center',
							},
						],
					],
				},
				layout: {
					hLineWidth: () => 0,
					vLineWidth: () => 0,
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0,
				},
			},
			{
				text: pdfWrapText(title),
				fontSize: 10,
				bold: true,
				alignment: 'center',
				margin: [0, 6, 0, 0],
			},
			...legend.map((entry) => ({
				columns: [
					{
						width: 10,
						canvas: [
							{ type: 'rect', x: 0, y: 2, w: 7, h: 7, color: entry.color },
						],
					},
					{
						width: width - 10,
						text: pdfWrapText(`${entry.label}: ${entry.value}`),
						fontSize: 9,
					},
				],
				margin: [0, 5, 0, 0],
			})),
		],
	});
	let pending: OrderChartImage[] = [];
	const flush = () => {
		if (!pending.length) return;
		const columns = pending.map((chart) => tile(chart, halfWidth));
		if (columns.length === 1) columns.push({ width: halfWidth, stack: [] });
		rows.push({
			unbreakable: true,
			columns,
			columnGap: 16,
			margin: [0, 8, 0, 16],
		} as Content);
		pending = [];
	};
	for (const chart of charts) {
		if (!chart.image) continue;
		if (chart.kind === 'daily' || chart.title === ORDER_CHART_TITLES.daily) {
			flush();
			rows.push({
				unbreakable: true,
				stack: tile(chart, ORDER_PDF_CONTENT_WIDTH, true).stack,
				margin: [0, 8, 0, 16],
			} as Content);
		} else {
			pending.push(chart);
			if (pending.length === 2) flush();
		}
	}
	flush();
	return [
		{
			text: 'Grafikler',
			headlineLevel: 1,
			fontSize: 15,
			bold: true,
			margin: [0, 20, 0, 8],
		},
		...rows,
	];
}
