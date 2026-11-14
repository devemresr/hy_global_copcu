import { z } from 'zod';
import { purchaseFiltersSchema } from '../schemas/purchase.schema';
import type { FinanceFilters } from '../hooks/api/endpoints/useFinance';
import type { StockFilters } from '../hooks/api/endpoints/useStock';
import { PURCHASE_PERIOD_PRESETS } from '../constants/purchaseReports.constant';
import { purchasePresetRange } from './purchasePeriod.helper';

export type AnalysisUrlFilters = StockFilters & FinanceFilters;
const schema = z.intersection(
	purchaseFiltersSchema,
	z.object({
		movementType: z
			.enum([
				'all-movements',
				'purchase-entries',
				'all-sales',
				'full-stock-sales',
				'partial-sales',
			])
			.optional(),
		productType: z.enum(['EMMC', 'EMCP', 'IPHONE', 'TABLET']).optional(),
		memoryGb: z.number().int().min(8).max(1024).optional(),
		investorId: z.string().uuid().optional(),
		group: z.enum(['purchase', 'sale', 'other', 'investment']).optional(),
		direction: z.enum(['income', 'expense']).optional(),
		categoryId: z.string().max(100).optional(),
	}),
);
const stringFields = [
	'from',
	'until',
	'bayiName',
	'bayiId',
	'purchaseId',
	'investorId',
	'categoryId',
	'group',
	'direction',
	'movementType',
	'productType',
] as const;
const numberFields = ['minTotal', 'maxTotal', 'memoryGb'] as const;
export function hasAnalysisFilters(search: URLSearchParams) {
	return (
		search.has('filters') ||
		search.has('period') ||
		search.has('bayi') ||
		[...stringFields, ...numberFields].some((key) => search.has(key)) ||
		[...search.keys()].some((key) => /^(field|type|size|min|max)\d+$/.test(key))
	);
}
function readableFilters(search: URLSearchParams): Record<string, unknown> {
	const raw: Record<string, unknown> = {};
	const number = (key: string) => {
		const value = search.get(key)!;
		if (!value.trim()) throw new Error('Empty number');
		return Number(value);
	};
	for (const key of stringFields)
		if (search.has(key))
			raw[key] =
				key === 'productType'
					? search.get(key)!.toUpperCase()
					: search.get(key);
	for (const key of numberFields) if (search.has(key)) raw[key] = number(key);
	if (search.has('bayi')) raw.bayiIds = search.getAll('bayi');
	const indices = new Set<number>();
	for (const key of search.keys()) {
		const match = /^(field|type|size|min|max)(\d+)$/.exec(key);
		if (match) {
			const index = Number(match[2]);
			if (index < 1 || index > 30) throw new Error('Invalid condition');
			indices.add(index);
		}
	}
	if (indices.size)
		raw.numericFilters = [...indices]
			.sort((a, b) => a - b)
			.map((index) => ({
				field: search.get('field' + index),
				...(search.has('type' + index)
					? { productType: search.get('type' + index)!.toUpperCase() }
					: {}),
				...(search.has('size' + index)
					? { memoryGb: number('size' + index) }
					: {}),
				...(search.has('min' + index) ? { min: number('min' + index) } : {}),
				...(search.has('max' + index) ? { max: number('max' + index) } : {}),
			}));
	const period = search.get('period');
	if (period === 'allTime') {
		delete raw.from;
		delete raw.until;
	} else if (period && period !== 'custom') {
		const preset = PURCHASE_PERIOD_PRESETS.find((p) => p.id === period);
		if (!preset) throw new Error('Invalid period');
		Object.assign(raw, purchasePresetRange(preset.id));
	}
	return raw;
}
export function readAnalysisFilters(
	search: URLSearchParams,
): AnalysisUrlFilters | null {
	if (!hasAnalysisFilters(search)) return null;
	try {
		const raw: unknown = search.has('filters')
			? JSON.parse(search.get('filters')!)
			: readableFilters(search);
		const parsed = schema.safeParse(raw);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
export function analysisSearch(
	preset: string,
	filters: AnalysisUrlFilters,
	view = 'movements',
	groupBy = 'product',
) {
	const relative = PURCHASE_PERIOD_PRESETS.find((p) => {
		const range = purchasePresetRange(p.id);
		return range.from === filters.from && range.until === filters.until;
	});
	const search = new URLSearchParams({
		preset,
		period:
			relative?.id ?? (filters.from || filters.until ? 'custom' : 'allTime'),
	});
	for (const key of stringFields) {
		const value = filters[key];
		if (
			value !== undefined &&
			!(relative && (key === 'from' || key === 'until'))
		)
			search.set(
				key,
				key === 'productType' ? String(value).toLowerCase() : String(value),
			);
	}
	for (const key of numberFields)
		if (filters[key] !== undefined) search.set(key, String(filters[key]));
	for (const id of filters.bayiIds ?? []) search.append('bayi', id);
	for (const [index, filter] of (filters.numericFilters ?? []).entries()) {
		const n = index + 1;
		search.set('field' + n, filter.field);
		if (filter.productType)
			search.set('type' + n, filter.productType.toLowerCase());
		if (filter.memoryGb !== undefined)
			search.set('size' + n, String(filter.memoryGb));
		if (filter.min !== undefined) search.set('min' + n, String(filter.min));
		if (filter.max !== undefined) search.set('max' + n, String(filter.max));
	}
	if (view !== (preset === 'bayis' ? 'bayi' : 'movements'))
		search.set('view', view);
	if (groupBy !== 'product') search.set('groupBy', groupBy);
	return search;
}
