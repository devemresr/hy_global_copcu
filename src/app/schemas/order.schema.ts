import { z } from 'zod';
import { ORDER_PRODUCT_TYPES } from '../constants/orderProducts.constant';

export const orderLineSchema = z
	.object({
		type: z.enum(['EMCP', 'EMMC', 'IPHONE', 'TABLET']),
		quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001),
		quantityUnit: z.enum(['piece', 'kg', 'g']).default('piece'),
		totalPriceOverride: z
			.number()
			.finite()
			.min(0)
			.max(1e12)
			.multipleOf(0.01)
			.optional(),
		unitPriceOverride: z
			.number()
			.finite()
			.min(0)
			.max(1_000_000)
			.multipleOf(0.000001)
			.optional(),
		manualListPrice: z
			.number()
			.finite()
			.min(0)
			.max(1_000_000)
			.multipleOf(0.01)
			.optional(),
		memoryGb: z
			.number()
			.int()
			.min(8)
			.max(1024)
			.refine((value) => Number.isInteger(Math.log2(value)))
			.nullable()
			.optional(),
	})
	.strict()
	.superRefine((line, context) => {
		if (
			ORDER_PRODUCT_TYPES[line.type].requiresMemorySize &&
			line.quantityUnit !== 'piece'
		)
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['quantityUnit'],
				message: 'Bellek ürünleri adet ile takip edilir.',
			});
		if (
			ORDER_PRODUCT_TYPES[line.type].requiresMemorySize &&
			line.memoryGb == null
		)
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['memoryGb'],
				message: 'Bu ürün için bellek boyutu seçin.',
			});
		if (
			!ORDER_PRODUCT_TYPES[line.type].requiresMemorySize &&
			line.memoryGb != null
		)
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['memoryGb'],
				message: 'Bu ürün bellek boyutu kullanmıyor.',
			});
		if (line.quantityUnit === 'piece' && !Number.isInteger(line.quantity))
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['quantity'],
				message: 'Adet tam sayı olmalıdır.',
			});
	});
export const createOrderSchema = z
	.object({
		bayiId: z.string().regex(/^[a-f\d]{24}$/i, 'Bir bayi seçin.'),
		lines: z.array(orderLineSchema).min(1).max(200),
	})
	.strict()
	.refine(
		(value) =>
			new Set(value.lines.map((line) => `${line.type}:${line.memoryGb ?? '-'}`))
				.size === value.lines.length,
		'Aynı ürünü bir kez ekleyin; miktarını aynı satırda düzenleyin.',
	);
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine(
		(value) =>
			!Number.isNaN(Date.parse(value)) &&
			new Date(value).toISOString().slice(0, 10) === value,
	);
export const orderFiltersSchema = z
	.object({
		bayiName: z.string().trim().max(120).optional(),
		from: dateSchema.optional(),
		until: dateSchema.optional(),
		minTotal: z.number().finite().min(0).max(1e15).optional(),
		maxTotal: z.number().finite().min(0).max(1e15).optional(),
	})
	.refine(
		(value) => !value.from || !value.until || value.from <= value.until,
		'Başlangıç tarihi bitişten sonra olamaz.',
	)
	.refine(
		(value) =>
			value.minTotal === undefined ||
			value.maxTotal === undefined ||
			value.minTotal <= value.maxTotal,
		'Fiyat aralığı geçersiz.',
	);
export type OrderLine = z.input<typeof orderLineSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;
