import { z } from 'zod';
import { getAccessToken } from '../hooks/api/core/tokenManager';

const input = z.union([z.number().finite().min(0).max(1e12), z.literal('')]);
const product = z.enum(['EMMC', 'EMCP', 'IPHONE', 'TABLET']);
export const purchaseDraftSchema = z.object({
	bayiId: z.string().max(24),
	nextId: z.number().int().min(1),
	lines: z
		.array(
			z.object({
				id: z.number().int().min(0),
				type: product,
				memoryGb: z.number().int().min(8).max(1024).nullable(),
				requiresMemorySize: z.boolean(),
				quantityUnit: z.enum(['piece', 'kg', 'g']),
				quantity: input,
				unitPriceOverride: input.nullable(),
				totalPriceOverride: input.nullable(),
			}),
		)
		.min(1)
		.max(200),
});
export type PurchaseDraft = z.infer<typeof purchaseDraftSchema>;
export const saleDraftSchema = z.object({
	mode: z.enum(['partial', 'complete']),
	nextId: z.number().int().min(1),
	requestId: z.string().uuid(),
	rows: z
		.array(
			z.object({
				id: z.number().int().min(0),
				key: z.string().min(1).max(100),
				unit: z.enum(['piece', 'kg', 'g']),
				quantity: input,
				revenue: input,
				unitPrice: input.optional(),
			}),
		)
		.min(1)
		.max(200),
});
export type SaleDraft = z.infer<typeof saleDraftSchema>;
export function orderDraftKey(kind: 'purchase' | 'sale'): string | null {
	try {
		const token = getAccessToken();
		if (!token) return null;
		const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(encoded));
		return typeof payload.userId === 'string'
			? `hy:${kind}:draft:v1:${payload.userId}`
			: null;
	} catch {
		return null;
	}
}
export function readOrderDraft<T>(
	key: string | null,
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): { data: T; savedAt: string } | null {
	if (!key) return null;
	try {
		const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
		if (
			stored?.version !== 1 ||
			typeof stored.savedAt !== 'string' ||
			!Number.isFinite(Date.parse(stored.savedAt))
		)
			return null;
		const result = schema.safeParse(stored.data);
		return result.success
			? { data: result.data, savedAt: stored.savedAt }
			: null;
	} catch {
		return null;
	}
}
