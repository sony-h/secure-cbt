import { z } from 'zod';

export const startSessionSchema = z.object({
  token: z.string().min(4, { message: 'Token minimal 4 karakter' }).max(20, { message: 'Token maksimal 20 karakter' }),
  device_id: z.string().max(255, { message: 'ID perangkat maksimal 255 karakter' }),
  exam_id: z.string().uuid({ message: 'ID ujian tidak valid' }).optional(),
});

export const resumeSessionSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  resumed_from_exit: z.boolean().optional(),
});

export const syncTimeSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  remaining_time_seconds: z.number().int({ message: 'Sisa waktu harus bilangan bulat' }).min(0, { message: 'Sisa waktu tidak boleh negatif' }),
});

export const submitSessionSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
});

export const reopenSessionSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  additional_minutes: z
    .number()
    .int({ message: 'Menit tambahan harus bilangan bulat' })
    .min(0, { message: 'Menit tambahan tidak boleh negatif' })
    .max(60, { message: 'Menit tambahan maksimal 60 menit' })
    .optional(),
  reset_strikes: z.boolean().default(true),
});

export const authorizeRemedialSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
});

export const bulkAuthorizeRemedialSchema = z.object({
  student_ids: z
    .array(z.string().uuid({ message: 'ID siswa tidak valid' }))
    .min(1, { message: 'Pilih minimal satu siswa untuk otorisasi remedial' }),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ResumeSessionInput = z.infer<typeof resumeSessionSchema>;
export type SyncTimeInput = z.infer<typeof syncTimeSchema>;
export type SubmitSessionInput = z.infer<typeof submitSessionSchema>;
export type ReopenSessionInput = z.infer<typeof reopenSessionSchema>;
export type AuthorizeRemedialInput = z.infer<typeof authorizeRemedialSchema>;
export type BulkAuthorizeRemedialInput = z.infer<typeof bulkAuthorizeRemedialSchema>;
