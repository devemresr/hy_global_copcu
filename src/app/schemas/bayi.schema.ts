import { normalizeBayiPhone } from '../helpers/bayiPhone.helper';
import { z } from 'zod';

export const bayiInputSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, 'Bayi adını girin.')
			.max(120, 'Bayi adı en fazla 120 karakter olabilir.'),
		phone: z
			.string()
			.trim()
			.min(1, 'Telefon numarasını girin.')
			.max(64)
			.refine(
				(phone) => Boolean(normalizeBayiPhone(phone)),
				'Geçerli bir telefon numarası girin.',
			),
	})
	.strict();
export type BayiInput = z.infer<typeof bayiInputSchema>;
export const bayiSchema = z.object({
	_id: z.string().regex(/^[a-f\d]{24}$/i),
	name: z.string(),
	phone: z.string(),
});
export type Bayi = z.infer<typeof bayiSchema>;
export const bayiConflictSchema = z.object({
	selectedBayiId: z.string(),
	matches: z
		.array(
			z.object({
				bayi: bayiSchema,
				fields: z.array(z.enum(['name', 'phone'])),
			}),
		)
		.min(1),
});
export type BayiConflict = z.infer<typeof bayiConflictSchema>;
