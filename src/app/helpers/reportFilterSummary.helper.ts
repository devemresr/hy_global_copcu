import {
	numericFilterLabel,
	type NumericFilterLabelInput,
} from './numericFilterLabel.helper';

type Filters = {
	from?: string;
	until?: string;
	bayiIds?: string[];
	bayiId?: string;
	bayiName?: string;
	investorId?: string;
	categoryId?: string;
	purchaseId?: string;
	direction?: string;
	group?: string;
	movementType?: string;
	productType?: string;
	memoryGb?: number;
	minTotal?: number;
	maxTotal?: number;
	numericFilters?: NumericFilterLabelInput[];
	excludeIds?: string[];
	excludeSaleIds?: string[];
};
export function reportFilterSummary(
	filters: Filters,
	names: {
		bayiName?: string | null;
		investorName?: string | null;
		categoryName?: string | null;
	} = {},
) {
	const productNames: Record<string, string> = {
		EMMC: 'eMMC',
		EMCP: 'eMCP',
		IPHONE: 'iPhone',
		TABLET: 'Tablet',
	};
	const movements: Record<string, string> = {
		'all-movements': 'Tüm hareketler',
		'purchase-entries': 'Alışlar',
		'all-sales': 'Tüm satışlar',
		'full-stock-sales': 'Tam satışlar',
		'partial-sales': 'Kısmi satışlar',
	};
	const groups: Record<string, string> = {
		purchase: 'Mal alış',
		sale: 'Satış',
		other: 'Gider',
		investment: 'Gelir',
	};
	const result = [
		`Tarih: ${filters.from ?? 'Başlangıç sınırı yok'} – ${filters.until ?? 'Bitiş sınırı yok'} (İstanbul)`,
	];
	if (filters.bayiIds?.length || filters.bayiId || filters.bayiName)
		result.push(
			'Bayi: ' +
				(names.bayiName ||
					filters.bayiName ||
					filters.bayiIds?.join(', ') ||
					filters.bayiId),
		);
	if (filters.investorId)
		result.push('Yatırımcı: ' + (names.investorName || filters.investorId));
	if (filters.categoryId)
		result.push(
			'Gelir / gider türü: ' + (names.categoryName || filters.categoryId),
		);
	if (filters.direction)
		result.push('Yön: ' + (filters.direction === 'income' ? 'Gelir' : 'Gider'));
	if (filters.group)
		result.push('Ana tür: ' + (groups[filters.group] ?? filters.group));
	if (filters.movementType)
		result.push(
			'Hareket: ' + (movements[filters.movementType] ?? filters.movementType),
		);
	if (filters.productType)
		result.push(
			'Ürün: ' +
				(productNames[filters.productType] ?? filters.productType) +
				(filters.memoryGb === undefined ? '' : ' ' + filters.memoryGb + ' GB'),
		);
	if (filters.purchaseId) result.push('Kaynak alış: ' + filters.purchaseId);
	if (filters.minTotal !== undefined || filters.maxTotal !== undefined)
		result.push(
			numericFilterLabel({
				field: 'total',
				min: filters.minTotal,
				max: filters.maxTotal,
			}),
		);
	result.push(...(filters.numericFilters ?? []).map(numericFilterLabel));
	if (filters.excludeIds?.length)
		result.push(`Seçim dışında bırakılan alış: ${filters.excludeIds.length}`);
	if (filters.excludeSaleIds?.length)
		result.push(
			`Seçim dışında bırakılan satış: ${filters.excludeSaleIds.length}`,
		);
	return result;
}
