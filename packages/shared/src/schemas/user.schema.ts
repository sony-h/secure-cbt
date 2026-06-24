import { z } from 'zod';
import { UserRole } from '../enums';

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(UserRole),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  is_active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
