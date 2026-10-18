import { z } from 'zod';

export const createTeacherSchema = z.object({
  nip: z
    .string()
    .max(30, { message: 'NIP/NIY maksimal 30 karakter' })
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  full_name: z.string().min(1, { message: 'Nama wajib diisi' }).max(200, { message: 'Nama maksimal 200 karakter' }),
  subject_ids: z.array(z.string().uuid({ message: 'ID mata pelajaran tidak valid' })).optional(),
});

export const updateTeacherSchema = z.object({
  nip: z
    .string()
    .max(30, { message: 'NIP/NIY maksimal 30 karakter' })
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  full_name: z.string().min(1, { message: 'Nama wajib diisi' }).max(200, { message: 'Nama maksimal 200 karakter' }).optional(),
  subject_ids: z.array(z.string().uuid({ message: 'ID mata pelajaran tidak valid' })).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
