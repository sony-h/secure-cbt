import { z } from 'zod';

export const reportRequestSchema = z.object({
  exam_id: z.string().uuid({ message: 'ID ujian tidak valid' }).optional(),
  class_id: z.string().uuid({ message: 'ID kelas tidak valid' }).optional(),
  format: z.enum(['pdf', 'excel'], { errorMap: () => ({ message: 'Format harus PDF atau Excel' }) }),
});

export type ReportRequestInput = z.infer<typeof reportRequestSchema>;
