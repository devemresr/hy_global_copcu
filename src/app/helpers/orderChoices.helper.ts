import {
	ORDER_MEMORY_SIZES,
	ORDER_PRODUCT_TYPES,
	ORDER_PRODUCT_TYPE_ORDER,
} from '../constants/orderProducts.constant';

export type ProductChoice = {
	type: keyof typeof ORDER_PRODUCT_TYPES;
	memoryGb: number | null;
	requiresMemorySize: boolean;
};
export const orderChoiceKey = (
	choice: Pick<ProductChoice, 'type' | 'memoryGb'>,
) => `${choice.type}:${choice.memoryGb ?? '-'}`;
export function compareProductChoices(
	a: Pick<ProductChoice, 'type' | 'memoryGb'>,
	b: Pick<ProductChoice, 'type' | 'memoryGb'>,
) {
	const memoryA = ORDER_PRODUCT_TYPES[a.type].requiresMemorySize,
		memoryB = ORDER_PRODUCT_TYPES[b.type].requiresMemorySize;
	return (
		Number(memoryB) - Number(memoryA) ||
		(memoryA && memoryB ? (a.memoryGb ?? 0) - (b.memoryGb ?? 0) : 0) ||
		ORDER_PRODUCT_TYPE_ORDER.indexOf(a.type) -
			ORDER_PRODUCT_TYPE_ORDER.indexOf(b.type)
	);
}
export function orderChoices(
	productTypes: Record<
		ProductChoice['type'],
		{ label: string; requiresMemorySize: boolean }
	> = ORDER_PRODUCT_TYPES,
	memorySizes: readonly number[] = ORDER_MEMORY_SIZES,
): ProductChoice[] {
	return ORDER_PRODUCT_TYPE_ORDER.filter((type) => productTypes[type])
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
