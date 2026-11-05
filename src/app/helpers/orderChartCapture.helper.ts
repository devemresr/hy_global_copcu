import { Chart, type ChartConfiguration, type Plugin } from 'chart.js';
import {
	ORDER_CHART_PALETTES,
	formatOrderMoney,
} from '../constants/orderReports.constant';
import type { OrderChartImage } from './orderReport.helper';

type PrintableChart = Chart<'line'> | Chart<'bar'> | Chart<'pie'>;
export function captureOrderChart(
	source: PrintableChart,
	kind: 'daily' | 'byType' | 'byMemory',
	title: string,
	dark: boolean,
): OrderChartImage {
	const palette = ORDER_CHART_PALETTES[dark ? 'dark' : 'light'];
	const type = 'type' in source.config ? source.config.type : 'bar';
	const labels = (source.data.labels ?? []).map(String);
	const values = source.data.datasets[0].data.map((value) =>
		typeof value === 'number' ? value : 0,
	);
	const sourceColors = source.data.datasets[0].backgroundColor;
	const colors = labels.map((_, index) =>
		typeof sourceColors === 'string'
			? sourceColors
			: Array.isArray(sourceColors) && typeof sourceColors[index] === 'string'
				? (sourceColors[index] as string)
				: palette.series[index % palette.series.length],
	);
	const canvas = document.createElement('canvas');
	canvas.width = kind === 'daily' ? 1200 : 900;
	canvas.height = kind === 'daily' ? 420 : 600;
	const formatValue = (value: number) =>
		kind === 'byMemory'
			? `${value.toLocaleString('tr-TR')} adet`
			: formatOrderMoney(value);
	const background: Plugin<'line' | 'bar' | 'pie'> = {
		id: 'order-export-background',
		beforeDraw(chart) {
			const { ctx } = chart;
			ctx.save();
			ctx.fillStyle = palette.background;
			ctx.fillRect(0, 0, chart.width, chart.height);
			ctx.restore();
		},
	};
	// Pie values live in a complete, colored PDF legend. Tiny slices never lose
	// their values to label collisions, and no hover state enters the bitmap.
	const valuesPlugin: Plugin<'line' | 'bar' | 'pie'> = {
		id: 'order-export-values',
		afterDatasetsDraw(chart) {
			if (type === 'pie') return;
			const { ctx } = chart;
			ctx.save();
			ctx.font = '24px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillStyle = palette.text;
			let previousRight = -Infinity;
			chart.getDatasetMeta(0).data.forEach((point, index) => {
				const text = formatValue(values[index]);
				const width = ctx.measureText(text).width;
				const x = Math.max(
					width / 2 + 4,
					Math.min(chart.width - width / 2 - 4, point.x),
				);
				if (x - width / 2 > previousRight + 6) {
					ctx.fillText(text, x, Math.max(26, point.y - 12));
					previousRight = x + width / 2;
				}
			});
			ctx.restore();
		},
	};
	const config: ChartConfiguration<'line' | 'bar' | 'pie'> = {
		type,
		data: {
			labels,
			datasets: [
				{
					label: kind === 'byMemory' ? 'Adet' : 'Tutar (TL)',
					data: values,
					backgroundColor: colors,
					borderColor: type === 'line' ? palette.series[0] : palette.background,
					borderWidth: type === 'line' ? 3 : 2,
					pointBackgroundColor: palette.series[0],
				},
			],
		},
		options: {
			responsive: false,
			maintainAspectRatio: false,
			animation: false,
			events: [],
			color: palette.text,
			font: { size: 24 },
			layout: { padding: 24 },
			plugins: { tooltip: { enabled: false }, legend: { display: false } },
			...(type === 'pie'
				? {}
				: {
						scales: {
							x: {
								ticks: { color: palette.text, maxTicksLimit: 10 },
								grid: { color: palette.grid },
							},
							y: {
								beginAtZero: true,
								ticks: { color: palette.text },
								grid: { color: palette.grid },
							},
						},
					}),
		},
		plugins: [background, valuesPlugin],
	};
	const chart = new Chart(canvas, config);
	try {
		return {
			kind,
			title,
			image: chart.toBase64Image('image/jpeg', 0.95),
			...(type === 'pie'
				? {
						legend: labels.map((label, index) => ({
							label,
							value: formatValue(values[index]),
							color: colors[index],
						})),
					}
				: {}),
		};
	} finally {
		chart.destroy();
	}
}
