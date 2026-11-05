import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type Ref } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OrderCharts } from '../app/component/admin/OrderCharts';
import type {
	Order,
	OrdersResponse,
} from '../app/hooks/api/endpoints/useOrders';
import { ThemeContext, type Theme } from '../app/hooks/useTheme';
import { toast } from 'sonner';

const { download } = vi.hoisted(() => ({
	download: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../app/helpers/orderReport.helper', () => ({
	downloadOrderReport: download,
}));
vi.mock('../app/helpers/orderChartCapture.helper', () => ({
	captureOrderChart: (_chart: unknown, kind: string, title: string) => ({
		kind,
		title,
		image: 'data:image/png;base64,chart',
	}),
}));
vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('react-chartjs-2', async () => {
	const { createElement, useImperativeHandle } = await import('react');
	function MockChart({
		ref,
		data,
		options,
		'aria-label': label,
	}: {
		ref?: Ref<unknown>;
		data: unknown;
		options: unknown;
		'aria-label'?: string;
	}) {
		useImperativeHandle(ref, () => ({
			toBase64Image: () => 'data:image/png;base64,chart',
			options: { font: { size: 12 } },
			resize: vi.fn(),
			update: vi.fn(),
		}));
		return createElement('canvas', {
			'aria-label': label,
			'data-chart': JSON.stringify(data),
			'data-options': JSON.stringify(options),
		});
	}
	return {
		Line: (props: Parameters<typeof MockChart>[0]) =>
			createElement(
				'div',
				{ 'data-kind': 'line' },
				createElement(MockChart, props),
			),
		Pie: (props: Parameters<typeof MockChart>[0]) =>
			createElement(
				'div',
				{ 'data-kind': 'pie' },
				createElement(MockChart, props),
			),
		Scatter: (props: Parameters<typeof MockChart>[0]) =>
			createElement(
				'div',
				{ 'data-kind': 'scatter' },
				createElement(MockChart, props),
			),
		Bar: (props: Parameters<typeof MockChart>[0]) =>
			createElement(
				'div',
				{ 'data-kind': 'bar' },
				createElement(MockChart, props),
			),
	};
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
	if (root) act(() => root?.unmount());
	root = undefined;
	container?.remove();
	download.mockReset().mockResolvedValue(undefined);
	vi.clearAllMocks();
});
const data: OrdersResponse = {
	orders: [],
	page: 1,
	totalPages: 10,
	summary: { count: 10, quantity: 50, total: 1000 },
	daily: [{ _id: '2026-11-04', count: 10, total: 1000 }],
	byType: [
		{ _id: 'EMMC', total: 600, quantity: 30 },
		{ _id: 'EMCP', total: 400, quantity: 20 },
	],
	byMemory: [{ _id: 64, total: 1000, quantity: 50 }],
};
function mount(refreshing = false, report = data, theme: Theme = 'light') {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root!.render(
			createElement(
				ThemeContext.Provider,
				{ value: { theme } },
				createElement(OrderCharts, {
					data: report,
					filters: { minTotal: 0, from: '2026-11-01' },
					refreshing,
				}),
			),
		),
	);
}
describe('order charts', () => {
	it('keeps calendar and grouped-list options inside the amount chart selector', () => {
		const timeline = [
			{
				_id: 'order-1',
				name: 'Named order',
				createdAt: '2026-11-04T12:00:00Z',
				total: 750,
				quantity: 3,
			},
		];
		mount(false, { ...data, orders: [], timeline });
		const select = container.querySelector<HTMLSelectElement>(
			'select[aria-label="Tutar grafiği türü"]',
		)!;
		expect([...select.options].map((option) => option.value)).toEqual([
			'line',
			'bar',
			'list',
			'calendar',
		]);
		expect(container.textContent).not.toContain('Alışlarin tarih görünümü');
		act(() => {
			select.value = 'calendar';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(
			container.querySelector('button[aria-label^="04.11.2026:"]')?.textContent,
		).toContain('1 sip.');
		act(() => {
			select.value = 'list';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('04.11.2026 · 1 alış');
		expect(container.textContent).toContain('Named order');
	});
	it('keeps type, storage and quantity together in each saved-order table row', () => {
		mount();
		const order: Order = {
			_id: 'saved',
			name: 'Alış',
			createdAt: '2026-11-04T12:00:00Z',
			quantity: 5,
			total: 700,
			lines: [
				{ type: 'EMMC', memoryGb: 64, quantity: 2, unitPrice: 300, total: 600 },
				{
					type: 'EMCP',
					memoryGb: 16,
					quantity: 3,
					unitPrice: 100 / 3,
					total: 100,
				},
			],
		};
		act(() =>
			root!.render(
				createElement(
					ThemeContext.Provider,
					{ value: { theme: 'light' } },
					createElement(OrderCharts, {
						data,
						filters: {},
						refreshing: false,
						exportOrder: order,
					}),
				),
			),
		);
		const rows = [...container.querySelectorAll('details tbody tr')];
		expect(rows).toHaveLength(2);
		expect(
			[...rows[0].querySelectorAll('td')].map((cell) => cell.textContent),
		).toEqual(['eMMC – 64 GB', '2 adet', expect.any(String)]);
	});
	it('opens the history PDF configuration before downloading', async () => {
		mount();
		const open = vi.fn();
		act(() =>
			root!.render(
				createElement(
					ThemeContext.Provider,
					{ value: { theme: 'light' } },
					createElement(OrderCharts, {
						data,
						filters: {},
						refreshing: false,
						onOpenPdf: open,
					}),
				),
			),
		);
		expect(container.querySelectorAll('[role=switch]')).toHaveLength(0);
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-report]')!
				.click(),
		);
		expect(open).toHaveBeenCalledOnce();
		expect(download).not.toHaveBeenCalled();
	});
	it('keeps chart previews collapsed until requested', () => {
		mount();
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-controls]',
		)!;
		const preview = document.getElementById(
			toggle.getAttribute('aria-controls')!,
		)!;
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(preview.getAttribute('aria-hidden')).toBe('true');
		act(() => toggle.click());
		expect(preview.getAttribute('aria-hidden')).toBe('false');
	});
	it('omits the daily chart and its PDF toggle for a single saved order', () => {
		mount();
		const order = {
			_id: 'saved',
			name: 'Alış',
			createdAt: '2026-11-04T12:00:00Z',
			quantity: 50,
			total: 1000,
			lines: [],
		};
		act(() =>
			root!.render(
				createElement(
					ThemeContext.Provider,
					{ value: { theme: 'light' } },
					createElement(OrderCharts, {
						data,
						filters: {},
						refreshing: false,
						exportOrder: order,
					}),
				),
			),
		);
		expect(container.querySelectorAll('[role=switch]')).toHaveLength(2);
		expect(container.querySelectorAll('canvas')).toHaveLength(2);
		expect(container.textContent).not.toContain('Tarihlere göre alış tutarı');
	});
	it('uses switches only to exclude charts from the PDF, keeping screen charts visible', async () => {
		mount();
		for (const button of container.querySelectorAll<HTMLButtonElement>(
			'[role=switch]',
		))
			act(() => button.click());
		expect(container.querySelectorAll('canvas')).toHaveLength(3);
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-report]')!
				.click(),
		);
		expect(download).toHaveBeenCalledWith(data, expect.any(Object), []);
	});
	it('switches chart representations without changing their values and exports the selected views', async () => {
		mount();
		expect(
			[...container.querySelectorAll('[data-kind]')].map((el) =>
				el.getAttribute('data-kind'),
			),
		).toEqual(['line', 'pie', 'bar']);
		act(() =>
			container
				.querySelectorAll<HTMLSelectElement>('figcaption select')
				.forEach((select, index) => {
					select.value = index === 2 ? 'pie' : 'bar';
					select.dispatchEvent(new Event('change', { bubbles: true }));
				}),
		);
		expect(
			[...container.querySelectorAll('[data-kind]')].map((el) =>
				el.getAttribute('data-kind'),
			),
		).toEqual(['bar', 'bar', 'pie']);
		expect(
			JSON.parse(
				container.querySelectorAll('canvas')[2].getAttribute('data-chart')!,
			).datasets[0].data,
		).toEqual([50]);
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-report]')!
				.click(),
		);
		expect(download.mock.calls[0][2]).toHaveLength(3);
	});
	it('renders three aggregate charts and passes images and applied filters to PDF export', async () => {
		mount();
		const charts = [...container.querySelectorAll('canvas')];
		expect(charts).toHaveLength(3);
		expect(
			JSON.parse(charts[1].getAttribute('data-chart')!).datasets[0].data,
		).toEqual([600, 400]);
		expect(
			JSON.parse(charts[2].getAttribute('data-chart')!).datasets[0].data,
		).toEqual([50]);
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-report]')!
				.click(),
		);
		expect(download).toHaveBeenCalledWith(
			data,
			{ minTotal: 0, from: '2026-11-01' },
			expect.arrayContaining([
				expect.objectContaining({ image: 'data:image/png;base64,chart' }),
			]),
		);
		expect(download.mock.calls[0][2]).toHaveLength(3);
		expect(toast.success).toHaveBeenCalledWith('PDF raporu indirildi');
	});
	it('disables download while filters refresh', () => {
		mount(true);
		expect(
			container.querySelector<HTMLButtonElement>(
				'[data-action=download-report]',
			)!.disabled,
		).toBe(true);
	});
	it('shows no charts or downloadable report for empty results', () => {
		mount(false, {
			...data,
			summary: { count: 0, quantity: 0, total: 0 },
			daily: [],
			byType: [],
			byMemory: [],
		});
		expect(
			container.querySelector<HTMLButtonElement>(
				'[data-action=download-report]',
			)!.disabled,
		).toBe(true);
		expect(container.querySelectorAll('canvas')).toHaveLength(0);
	});
	it('shows download errors and allows retrying', async () => {
		download.mockRejectedValueOnce(new Error('PDF indirilemedi'));
		mount();
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-report]')!
				.click(),
		);
		expect(container.querySelector('[role=alert]')?.textContent).toContain(
			'PDF indirilemedi',
		);
		expect(
			container.querySelector<HTMLButtonElement>(
				'[data-action=download-report]',
			)!.disabled,
		).toBe(false);
		expect(toast.error).toHaveBeenCalledWith(
			'PDF indirilemedi',
			expect.any(Object),
		);
	});
	it('updates chart labels, grid, tooltips and series when the theme changes', () => {
		mount(false, data, 'dark');
		let chart = container.querySelector('canvas')!;
		let options = JSON.parse(chart.getAttribute('data-options')!);
		expect(options.color).toBe('#e2e8f0');
		expect(options.scales.y.ticks.color).toBe('#e2e8f0');
		expect(options.scales.y.grid.color).toBe('#33473e');
		expect(options.plugins.tooltip.backgroundColor).toBe('#243c31');
		expect(
			JSON.parse(chart.getAttribute('data-chart')!).datasets[0].borderColor,
		).toBe('#34d399');
		act(() =>
			root!.render(
				createElement(
					ThemeContext.Provider,
					{ value: { theme: 'light' } },
					createElement(OrderCharts, { data, filters: {}, refreshing: false }),
				),
			),
		);
		chart = container.querySelector('canvas')!;
		options = JSON.parse(chart.getAttribute('data-options')!);
		expect(options.color).toBe('#334155');
		expect(options.scales.y.grid.color).toBe('#e2e8f0');
	});
});
