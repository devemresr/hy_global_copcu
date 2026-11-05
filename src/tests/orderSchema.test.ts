import { describe, expect, it } from 'vitest';
import {
	createOrderSchema,
	orderFiltersSchema,
} from '../app/schemas/order.schema';

describe('order form schemas', () => {
	it('preserves zero price bounds and rejects invalid dates, values and ranges', () => {
		expect(orderFiltersSchema.parse({ minTotal: 0, maxTotal: 0 })).toEqual({
			minTotal: 0,
			maxTotal: 0,
		});
		for (const input of [
			{ from: '2026-02-30' },
			{ from: '2026-11-05', until: '2026-11-04' },
			{ minTotal: NaN },
			{ minTotal: Infinity },
			{ minTotal: -1 },
			{ minTotal: 20, maxTotal: 10 },
		])
			expect(orderFiltersSchema.safeParse(input).success).toBe(false);
	});
	it('validates order rows before submission', () => {
		expect(
			createOrderSchema.safeParse({
				bayiId: '000000000000000000000021',
				lines: [{ type: 'EMCP', memoryGb: 64, quantity: 5 }],
			}).success,
		).toBe(true);
		expect(
			createOrderSchema.safeParse({
				lines: [{ type: 'EMCP', memoryGb: 64, quantity: 5 }],
			}).success,
		).toBe(false);
		for (const input of [
			{ lines: [] },
			{ lines: [{ type: 'EMMC', memoryGb: 55, quantity: 1 }] },
			{ lines: [{ type: 'EMMC', memoryGb: 64, quantity: 0 }] },
		])
			expect(createOrderSchema.safeParse(input).success).toBe(false);
	});
});
