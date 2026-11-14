export const NUMERIC_FIELDS = {
	total: 'İşlem toplamı (TL)',
	productMatch: 'Ek sayısal koşul yok',
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
export type NumericFilterLabelInput = {
	field: NumericField;
	productType?: 'EMMC' | 'EMCP' | 'IPHONE' | 'TABLET';
	memoryGb?: number;
	min?: number;
	max?: number;
};
export function numericFilterLabel(filter: NumericFilterLabelInput) {
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
	if (filter.field === 'productMatch') return 'Ürün içerir: ' + scope;
	return `${scope} → ${NUMERIC_FIELDS[filter.field]}: ${filter.min?.toLocaleString('tr-TR', { maximumFractionDigits: 6 }) ?? 'Alt sınır yok'} – ${filter.max?.toLocaleString('tr-TR', { maximumFractionDigits: 6 }) ?? 'Üst sınır yok'}`;
}
