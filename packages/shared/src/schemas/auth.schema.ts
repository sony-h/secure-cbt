import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, { message: 'Username minimal 3 karakter' }).max(50, { message: 'Username maksimal 50 karakter' }),
  password: z.string().min(6, { message: 'Kata sandi minimal 6 karakter' }).max(100, { message: 'Kata sandi maksimal 100 karakter' }),
  device_id: z.string().uuid({ message: 'ID perangkat tidak valid' }).optional(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, { message: 'Token wajib diisi' }),
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, { message: 'Kata sandi lama wajib diisi' }),
  new_password: z.string().min(8, { message: 'Kata sandi baru minimal 8 karakter' }).max(100, { message: 'Kata sandi baru maksimal 100 karakter' }),
});

export const passwordSchema = z
  .string()
  .min(8, { message: 'Kata sandi minimal 8 karakter' })
  .max(100, { message: 'Kata sandi maksimal 100 karakter' })
  .regex(/[A-Z]/, { message: 'Kata sandi harus mengandung huruf kapital' })
  .regex(/[a-z]/, { message: 'Kata sandi harus mengandung huruf kecil' })
  .regex(/[0-9]/, { message: 'Kata sandi harus mengandung angka' });

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
