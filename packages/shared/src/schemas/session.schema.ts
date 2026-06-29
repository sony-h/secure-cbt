import { z } from 'zod';

export const startSessionSchema = z.object({
  token: z.string().min(4, { message: 'Token minimal 4 karakter' }).max(20, { message: 'Token maksimal 20 karakter' }),
  device_id: z.string().max(255, { message: 'ID perangkat maksimal 255 karakter' }),
  exam_id: z.string().uuid({ message: 'ID ujian tidak valid' }).optional(),
});

export const resumeSessionSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
});

export const submitSessionSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ResumeSessionInput = z.infer<typeof resumeSessionSchema>;
export type SubmitSessionInput = z.infer<typeof submitSessionSchema>;
