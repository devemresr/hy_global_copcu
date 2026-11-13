import type { PriceUnit } from '../schemas/item.schema';

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
	piece: 'adet',
	kg: 'kg',
	g: 'g',
};
export const PRICE_UNIT_OPTIONS: { value: PriceUnit; label: string }[] = [
	{ value: 'piece', label: 'Adet başına' },
	{ value: 'kg', label: 'kg başına' },
	{ value: 'g', label: 'g başına' },
];
