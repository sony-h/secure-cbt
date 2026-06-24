import { z } from 'zod';

export const createTeacherSchema = z.object({
  nip: z.string().min(1).max(30),
  full_name: z.string().min(1).max(200),
  subject_ids: z.array(z.string().uuid()).optional(),
});

export const updateTeacherSchema = z.object({
  nip: z.string().min(1).max(30).optional(),
  full_name: z.string().min(1).max(200).optional(),
  subject_ids: z.array(z.string().uuid()).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
