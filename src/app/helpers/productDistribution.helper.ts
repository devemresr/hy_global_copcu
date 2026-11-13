import type { PurchasesResponse } from '../hooks/api/endpoints/usePurchases';
import { compareProductChoices } from './purchaseChoices.helper';

type ProductRow = NonNullable<PurchasesResponse['byTypeAndMemory']>[number];
export function productDistribution(lines: ProductRow[]) {
	const groups = new Map<string, ProductRow>();
	for (const line of lines) {
		const quantityUnit = line.quantityUnit ?? 'piece';
		const key = `${line.type}:${line.memoryGb ?? '-'}:${quantityUnit}`;
		const group = groups.get(key) ?? {
			...line,
			quantityUnit,
			quantity: 0,
			total: 0,
		};
		group.quantity += line.quantity;
		group.total += line.total;
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) =>
		compareProductChoices(
			{ ...a, memoryGb: a.memoryGb ?? null },
			{ ...b, memoryGb: b.memoryGb ?? null },
		),
	);
}
