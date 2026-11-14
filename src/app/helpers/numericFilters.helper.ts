import type { ReportKind } from '../constants/reportKinds.constant';
import { z } from '../util/zodTurkish';

import { NUMERIC_FIELDS } from './numericFilterLabel.helper';
export {
	NUMERIC_FIELDS,
	numericFilterLabel,
} from './numericFilterLabel.helper';
import type { NumericField } from './numericFilterLabel.helper';
export type { NumericField } from './numericFilterLabel.helper';
const fields = Object.keys(NUMERIC_FIELDS) as [NumericField, ...NumericField[]];
export const numericFilterSchema = z
	.object({
		field: z.enum(fields),
		productType: z.enum(['EMMC', 'EMCP', 'IPHONE', 'TABLET']).optional(),
		memoryGb: z.number().int().min(8).max(1024).optional(),
		min: z.number().finite().min(-1e15).max(1e15).optional(),
		max: z.number().finite().min(-1e15).max(1e15).optional(),
	})
	.strict()
	.refine(
		(v) =>
			(v.field === 'productMatch'
				? v.min === undefined && v.max === undefined
				: v.min !== undefined || v.max !== undefined) &&
			(v.min === undefined || v.max === undefined || v.min <= v.max),
		'Geçerli bir sayı aralığı girin.',
	)
	.refine(
		(v) =>
			!(
				(v.productType || v.memoryGb !== undefined) &&
				['total', 'recordPiece', 'recordKg', 'recordG', 'lineCount'].includes(
					v.field,
				)
			),
		'İşlem alanına ürün koşulu eklenemez.',
	)
	.refine(
		(v) =>
			v.memoryGb === undefined ||
			v.productType === 'EMMC' ||
			v.productType === 'EMCP',
		'Bellek boyutu için eMMC veya eMCP seçin.',
	);
export type NumericFilter = z.infer<typeof numericFilterSchema>;
export function numericFieldsFor(reportKind: ReportKind) {
	return fields.filter((field) =>
		reportKind === 'balance'
			? field === 'total'
			: reportKind === 'purchase'
				? !['purchaseCost', 'revenue', 'profit', 'margin'].includes(field) &&
					!field.startsWith('sellingPrice')
				: !field.startsWith('originalUnitPrice') &&
					!field.startsWith('priceAdjustment') &&
					field !== 'totalAdjustment' &&
					!field.startsWith('record') &&
					field !== 'lineCount',
	);
}
export function reportFilterParams<
	T extends { numericFilters?: NumericFilter[]; bayiIds?: string[] },
>(filters: T) {
	return {
		...filters,
		bayiIds: filters.bayiIds?.length ? filters.bayiIds.join(',') : undefined,
		numericFilters: filters.numericFilters?.length
			? JSON.stringify(filters.numericFilters)
			: undefined,
	};
}

export function numericFilterInput(field: NumericField): {
	decimalPlaces: number;
	steppers: [
		{ amount: number; label: string },
		{ amount: number; label: string },
	];
} {
	if (['recordPiece', 'quantityPiece', 'lineCount'].includes(field))
		return {
			decimalPlaces: 0,
			steppers: [
				{ amount: 1, label: '+1' },
				{ amount: 5, label: '+5' },
			],
		};
	if (['recordKg', 'quantityKg'].includes(field))
		return {
			decimalPlaces: 3,
			steppers: [
				{ amount: 0.1, label: '+0,1' },
				{ amount: 1, label: '+1' },
			],
		};
	if (['recordG', 'quantityG'].includes(field))
		return {
			decimalPlaces: 3,
			steppers: [
				{ amount: 1, label: '+1' },
				{ amount: 10, label: '+10' },
			],
		};
	if (field === 'margin')
		return {
			decimalPlaces: 2,
			steppers: [
				{ amount: 1, label: '+1' },
				{ amount: 5, label: '+5' },
			],
		};
	if (field.endsWith('G'))
		return {
			decimalPlaces: 6,
			steppers: [
				{ amount: 0.1, label: '+0,1' },
				{ amount: 1, label: '+1' },
			],
		};
	if (/(?:Piece|Kg)$/.test(field))
		return {
			decimalPlaces: 6,
			steppers: [
				{ amount: 10, label: '+10' },
				{ amount: 100, label: '+100' },
			],
		};
	return {
		decimalPlaces: 2,
		steppers: [
			{ amount: 100, label: '+100' },
			{ amount: 1000, label: '+1k' },
		],
	};
}
