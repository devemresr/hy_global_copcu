import {
	PURCHASE_MEMORY_SIZES,
	PURCHASE_PRODUCT_TYPES,
	PURCHASE_PRODUCT_TYPE_ORDER,
} from '../constants/purchaseProducts.constant';

export type ProductChoice = {
	type: keyof typeof PURCHASE_PRODUCT_TYPES;
	memoryGb: number | null;
	requiresMemorySize: boolean;
};
export const purchaseChoiceKey = (
	choice: Pick<ProductChoice, 'type' | 'memoryGb'>,
) => `${choice.type}:${choice.memoryGb ?? '-'}`;
export function compareProductChoices(
	a: Pick<ProductChoice, 'type' | 'memoryGb'>,
	b: Pick<ProductChoice, 'type' | 'memoryGb'>,
) {
	const memoryA = PURCHASE_PRODUCT_TYPES[a.type].requiresMemorySize,
		memoryB = PURCHASE_PRODUCT_TYPES[b.type].requiresMemorySize;
	return (
		Number(memoryB) - Number(memoryA) ||
		(memoryA && memoryB ? (a.memoryGb ?? 0) - (b.memoryGb ?? 0) : 0) ||
		PURCHASE_PRODUCT_TYPE_ORDER.indexOf(a.type) -
			PURCHASE_PRODUCT_TYPE_ORDER.indexOf(b.type)
	);
}
export function purchaseChoices(
	productTypes: Record<
		ProductChoice['type'],
		{ label: string; requiresMemorySize: boolean }
	> = PURCHASE_PRODUCT_TYPES,
	memorySizes: readonly number[] = PURCHASE_MEMORY_SIZES,
): ProductChoice[] {
	return PURCHASE_PRODUCT_TYPE_ORDER.filter((type) => productTypes[type])
		.flatMap<ProductChoice>((type) =>
			productTypes[type].requiresMemorySize
				? [...new Set(memorySizes)].map((memoryGb) => ({
						type,
						memoryGb,
						requiresMemorySize: true,
					}))
				: [{ type, memoryGb: null, requiresMemorySize: false }],
		)
		.sort(compareProductChoices);
}
