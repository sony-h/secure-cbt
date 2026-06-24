import { z } from 'zod';

export const reportRequestSchema = z.object({
  exam_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  format: z.enum(['pdf', 'excel']),
});

export type ReportRequestInput = z.infer<typeof reportRequestSchema>;
