import type { StorageUnit } from '../schemas/item.schema';

export const STORAGE_UNIT_OPTIONS: { value: StorageUnit; label: string }[] = [
	{ value: 'GB', label: 'GB' },
	{ value: 'TB', label: 'TB' },
];
