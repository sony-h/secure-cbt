import { z } from 'zod';
import { UserRole } from '../enums';

export const createUserSchema = z.object({
  username: z.string().min(3, { message: 'Username minimal 3 karakter' }).max(50, { message: 'Username maksimal 50 karakter' }),
  email: z.string().email({ message: 'Format email tidak valid' }).max(255, { message: 'Email maksimal 255 karakter' }),
  password: z.string().min(8, { message: 'Kata sandi minimal 8 karakter' }).max(100, { message: 'Kata sandi maksimal 100 karakter' }),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Role tidak valid' }) }),
});

export const updateUserSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }).max(255, { message: 'Email maksimal 255 karakter' }).optional(),
  is_active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
