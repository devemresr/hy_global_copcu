import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OrderPeriodPicker } from '../app/component/admin/OrderPeriodPicker';
import {
	istanbulToday,
	orderLastDaysRange,
	orderRangeLabel,
	orderMonthRange,
	orderPresetRange,
	orderReportFilename,
} from '../app/helpers/orderPeriod.helper';
import type { OrdersResponse } from '../app/hooks/api/endpoints/useOrders';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
	if (root) act(() => root?.unmount());
	root = undefined;
	container?.remove();
});
const report: OrdersResponse = {
	orders: [],
	page: 1,
	totalPages: 1,
	summary: { count: 2, total: 100, quantity: 2 },
	byMemory: [],
	byType: [],
	daily: [
		{ _id: '2026-10-01', count: 1, total: 50 },
		{ _id: '2026-11-04', count: 1, total: 50 },
	],
};
describe('order periods', () => {
	it('distinguishes calendar weeks from rolling days and includes today in custom ranges', () => {
		const wednesday = new Date('2026-11-04T12:00:00Z');
		expect(orderPresetRange('thisWeek', wednesday)).toEqual({
			from: '2026-11-02',
			until: '2026-11-04',
		});
		expect(orderPresetRange('last7Days', wednesday)).toEqual({
			from: '2026-10-29',
			until: '2026-11-04',
		});
		expect(orderPresetRange('last30Days', wednesday)).toEqual({
			from: '2026-10-06',
			until: '2026-11-04',
		});
		expect(orderLastDaysRange(1, wednesday)).toEqual({
			from: '2026-11-04',
			until: '2026-11-04',
		});
		expect(orderLastDaysRange(3, new Date('2024-03-01T12:00:00Z'))).toEqual({
			from: '2024-02-28',
			until: '2024-03-01',
		});
		for (const invalid of [0, -1, 1.5, NaN, 36501])
			expect(() => orderLastDaysRange(invalid, wednesday)).toThrow(RangeError);
		expect(orderRangeLabel(orderPresetRange('thisWeek', wednesday))).toBe(
			'02.11.2026 – 04.11.2026',
		);
	});
	it('toggles a preset off and hides manual date controls only while it is active', () => {
		function ControlledPicker() {
			const [value, setValue] = useState<{ from?: string; until?: string }>({});
			return createElement(OrderPeriodPicker, { value, onChange: setValue });
		}
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() => root!.render(createElement(ControlledPicker)));
		const today = [...container.querySelectorAll('button')].find(
			(button) => button.getAttribute('aria-label') === 'Bugün',
		)!;
		act(() => today.click());
		expect(today.getAttribute('aria-pressed')).toBe('true');
		expect(container.querySelector('select[id$="-month"]')).toBeNull();
		expect(container.querySelector('input[type=date]')).toBeNull();
		act(() => today.click());
		expect(today.getAttribute('aria-pressed')).toBe('false');
		expect(container.querySelector('select[id$="-month"]')).not.toBeNull();
		expect(container.textContent).toContain('Tüm tarihler');
	});
	it('resolves Istanbul midnight, Monday weeks, previous months and leap years', () => {
		const now = new Date('2026-01-04T21:30:00Z'); // Monday, January 5 in Istanbul.
		expect(istanbulToday(now)).toBe('2026-01-05');
		expect(orderPresetRange('today', now)).toEqual({
			from: '2026-01-05',
			until: '2026-01-05',
		});
		expect(orderPresetRange('yesterday', now)).toEqual({
			from: '2026-01-04',
			until: '2026-01-04',
		});
		expect(orderPresetRange('thisWeek', now)).toEqual({
			from: '2026-01-05',
			until: '2026-01-05',
		});
		expect(orderPresetRange('lastWeek', now)).toEqual({
			from: '2025-12-29',
			until: '2026-01-04',
		});
		expect(orderPresetRange('thisMonth', now)).toEqual({
			from: '2026-01-01',
			until: '2026-01-05',
		});
		expect(orderPresetRange('lastMonth', now)).toEqual({
			from: '2025-12-01',
			until: '2025-12-31',
		});
		expect(orderPresetRange('thisYear', now)).toEqual({
			from: '2026-01-01',
			until: '2026-01-05',
		});
		expect(orderPresetRange('lastYear', now)).toEqual({
			from: '2025-01-01',
			until: '2025-12-31',
		});
		expect(orderMonthRange(2024, 1)).toEqual({
			from: '2024-02-01',
			until: '2024-02-29',
		});
		expect(orderMonthRange(2026, 1)).toEqual({
			from: '2026-02-01',
			until: '2026-02-28',
		});
	});
	it('uses one date for a day and both dates for a range, including unbounded filters', () => {
		expect(
			orderReportFilename(report, { from: '2026-11-04', until: '2026-11-04' }),
		).toBe('alis-raporu_2026-11-04.pdf');
		expect(
			orderReportFilename(report, { from: '2026-10-01', until: '2026-10-31' }),
		).toBe('alis-raporu_2026-10-01_2026-10-31.pdf');
		expect(orderReportFilename(report, {})).toBe(
			'alis-raporu_2026-10-01_2026-11-04.pdf',
		);
	});
	it('selects a named month in the chosen year and supports a single custom day', () => {
		const onChange = vi.fn();
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() =>
			root!.render(
				createElement(OrderPeriodPicker, {
					value: { from: '2024-01-01', until: '2024-01-31' },
					onChange,
				}),
			),
		);
		const button = (text: string) =>
			[...container.querySelectorAll('button')].find(
				(b) => b.textContent === text,
			)!;
		const month = container.querySelector<HTMLSelectElement>(
			'select[id$="-month"]',
		)!;
		act(() => {
			month.value = '1';
			month.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(onChange).toHaveBeenLastCalledWith({
			from: '2024-02-01',
			until: '2024-02-29',
		});
		act(() => button('Dönemi uygula').click());
		expect(onChange).toHaveBeenLastCalledWith({
			from: '2024-02-01',
			until: '2024-02-01',
		});
	});
});
