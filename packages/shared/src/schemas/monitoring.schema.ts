import { z } from 'zod';

export const monitoringExamParamsSchema = z.object({
  id: z.string().uuid({ message: 'ID ujian tidak valid' }),
});

export const monitoringSessionParamsSchema = z.object({
  id: z.string().uuid({ message: 'ID sesi tidak valid' }),
});

export type MonitoringExamParams = z.infer<typeof monitoringExamParamsSchema>;
export type MonitoringSessionParams = z.infer<typeof monitoringSessionParamsSchema>;
