import { describe, expect, it, vi } from 'vitest';
import type { Chart as ChartType } from 'chart.js';
import { captureOrderChart } from '../app/helpers/orderChartCapture.helper';
import {
	ORDER_CHART_PALETTES,
	orderMemoryColorIndex,
} from '../app/constants/orderReports.constant';
import { pdfChartsSection } from '../app/helpers/pdfCharts.helper';
const { configs } = vi.hoisted(() => ({ configs: [] as unknown[] }));
vi.mock('chart.js', () => ({
	Chart: class {
		constructor(_canvas: unknown, config: unknown) {
			configs.push(config);
		}
		toBase64Image() {
			return 'data:image/png;base64,chart';
		}
		destroy() {}
	},
}));
describe('PDF pie exports', () => {
	it('includes tiny and zero values in a full unique-color key without hover interactions', () => {
		const sizes = [8, 16, 32, 64, 128, 256, 512, 1024];
		const colors = sizes.map(
			(size) => ORDER_CHART_PALETTES.dark.series[orderMemoryColorIndex(size)],
		);
		expect(new Set(colors).size).toBe(8);
		const source = {
			config: { type: 'pie' },
			data: {
				labels: sizes.map((size) => `${size} GB`),
				datasets: [
					{ data: [1000000, 1, 0, 2, 3, 4, 5, 6], backgroundColor: colors },
				],
			},
		} as unknown as ChartType<'pie'>;
		const result = captureOrderChart(source, 'byMemory', 'Memory', true);
		expect(result.legend).toHaveLength(8);
		expect(result.legend?.[1]).toMatchObject({
			label: '16 GB',
			value: '1 adet',
		});
		expect(result.legend?.[2]).toMatchObject({
			label: '32 GB',
			value: '0 adet',
		});
		expect(configs.at(-1)).toMatchObject({
			options: { events: [], plugins: { tooltip: { enabled: false } } },
		});
		const pdf = JSON.stringify(pdfChartsSection([result]));
		for (const size of sizes) expect(pdf).toContain(`${size} GB`);
	});
});
