import { z } from 'zod';

export const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
	password: z.string().min(1, 'Şifre gerekli'),
});

export type LoginInput = z.infer<typeof loginSchema>;
