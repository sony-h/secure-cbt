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
  can_monitor_all_subjects: z.boolean().optional(),
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
  can_monitor_all_subjects: z.boolean().optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

export const inviteTeacherSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }).max(150, { message: 'Email maksimal 150 karakter' }),
  subject_ids: z.array(z.string().uuid({ message: 'ID mata pelajaran tidak valid' })).optional(),
  can_monitor_all_subjects: z.boolean().optional(),
});

export const toggleTeacherStatusSchema = z.object({
  is_active: z.boolean(),
});

export type InviteTeacherInput = z.infer<typeof inviteTeacherSchema>;
export type ToggleTeacherStatusInput = z.infer<typeof toggleTeacherStatusSchema>;
