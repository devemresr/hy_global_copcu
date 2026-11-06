import { ORDER_PRODUCT_TYPES } from '../constants/orderProducts.constant';
import type { PurchaseWarningInput } from '../hooks/api/endpoints/useStock';

export type PurchaseInspection = {
	warnings: { productKey: string; message: string }[];
	risks?: { productKey: string; message: string; alreadyWarned: boolean }[];
	missingPrices?: string[];
};
export type WarningCache = Record<
	string,
	{
		risk?: { productKey: string; message: string; alreadyWarned?: boolean };
		missingPrice?: string;
	}
>;
type Line = PurchaseWarningInput['lines'][number];
function productKey(line: Line) {
	return `${line.type}:${ORDER_PRODUCT_TYPES[line.type].requiresMemorySize ? line.memoryGb : '-'}:${line.quantityUnit === 'piece' ? 'piece' : 'kg'}`;
}
export function warningInputKey(bayiId: string, line: Line) {
	return `${bayiId}:${productKey(line)}:${line.quantityUnit === 'g' ? line.unitPrice * 1000 : line.unitPrice}`;
}
export function mergePurchaseInspection(
	cache: WarningCache,
	input: PurchaseWarningInput,
	response: PurchaseInspection,
): WarningCache {
	const next = { ...cache };
	for (const line of input.lines) {
		const label = `${ORDER_PRODUCT_TYPES[line.type].label}${ORDER_PRODUCT_TYPES[line.type].requiresMemorySize ? ` ${line.memoryGb} GB` : ''} (${line.quantityUnit === 'piece' ? 'adet' : 'kg'})`;
		next[warningInputKey(input.bayiId, line)] = {
			risk: (response.risks ?? response.warnings).find(
				(risk) => risk.productKey === productKey(line),
			),
			missingPrice: response.missingPrices?.includes(label) ? label : undefined,
		};
	}
	return next;
}
