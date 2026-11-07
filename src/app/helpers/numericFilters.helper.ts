import { z } from 'zod';

export const NUMERIC_FIELDS = {
	total: 'İşlem toplamı (TL)',
	lineTotal: 'Ürün toplamı (TL)',
	recordPiece: 'Alış toplam miktarı (adet)',
	recordKg: 'Alış toplam miktarı (kg)',
	recordG: 'Alış toplam miktarı (g)',
	lineCount: 'Alıştaki ürün satırı sayısı',
	memoryGb: 'Bellek boyutu (GB)',
	quantityPiece: 'Ürün miktarı (adet)',
	quantityKg: 'Ürün miktarı (kg)',
	quantityG: 'Ürün miktarı (g)',
	unitPricePiece: 'Birim alış fiyatı (TL/adet)',
	unitPriceKg: 'Birim alış fiyatı (TL/kg)',
	unitPriceG: 'Birim alış fiyatı (TL/g)',
	originalUnitPricePiece: 'Liste alış fiyatı (TL/adet)',
	originalUnitPriceKg: 'Liste alış fiyatı (TL/kg)',
	originalUnitPriceG: 'Liste alış fiyatı (TL/g)',
	priceAdjustmentPiece: 'Birim fiyat farkı (TL/adet)',
	priceAdjustmentKg: 'Birim fiyat farkı (TL/kg)',
	priceAdjustmentG: 'Birim fiyat farkı (TL/g)',
	totalAdjustment: 'Toplam fiyat farkı (TL)',
	purchaseCost: 'Alış maliyeti (TL)',
	revenue: 'Satış geliri (TL)',
	profit: 'Gerçekleşen kâr (TL)',
	margin: 'Kâr marjı (%)',
	sellingPricePiece: 'Birim satış fiyatı (TL/adet)',
	sellingPriceKg: 'Birim satış fiyatı (TL/kg)',
	sellingPriceG: 'Birim satış fiyatı (TL/g)',
} as const;
export type NumericField = keyof typeof NUMERIC_FIELDS;
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
			(v.min !== undefined || v.max !== undefined) &&
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
export function numericFieldsFor(context: 'orders' | 'stock' | 'finance') {
	return fields.filter((field) =>
		context === 'finance'
			? field === 'total'
			: context === 'orders'
				? !['purchaseCost', 'revenue', 'profit', 'margin'].includes(field) &&
					!field.startsWith('sellingPrice')
				: !field.startsWith('originalUnitPrice') &&
					!field.startsWith('priceAdjustment') &&
					field !== 'totalAdjustment' &&
					!field.startsWith('record') &&
					field !== 'lineCount',
	);
}
export function numericFilterLabel(filter: NumericFilter) {
	const names = {
		EMMC: 'eMMC',
		EMCP: 'eMCP',
		IPHONE: 'iPhone',
		TABLET: 'Tablet',
	};
	const scope = filter.productType
		? names[filter.productType] +
			(filter.productType === 'EMMC' || filter.productType === 'EMCP'
				? filter.memoryGb === undefined
					? ' · tüm boyutlar'
					: ' · ' + filter.memoryGb + ' GB'
				: '')
		: ['total', 'recordPiece', 'recordKg', 'recordG', 'lineCount'].includes(
					filter.field,
			  )
			? 'İşlem geneli'
			: 'Tüm ürünler';
	return `${scope} → ${NUMERIC_FIELDS[filter.field]}: ${filter.min?.toLocaleString('tr-TR', { maximumFractionDigits: 6 }) ?? 'Alt sınır yok'} – ${filter.max?.toLocaleString('tr-TR', { maximumFractionDigits: 6 }) ?? 'Üst sınır yok'}`;
}
export function reportFilterParams<
	T extends { numericFilters?: NumericFilter[] },
>(filters: T) {
	return {
		...filters,
		numericFilters: filters.numericFilters?.length
			? JSON.stringify(filters.numericFilters)
			: undefined,
	};
}
