import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  device_id: z.string().uuid().optional(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(8).max(100),
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
