import { z } from 'zod';

export const monitoringExamParamsSchema = z.object({
  id: z.string().uuid(),
});

export const monitoringSessionParamsSchema = z.object({
  id: z.string().uuid(),
});

export type MonitoringExamParams = z.infer<typeof monitoringExamParamsSchema>;
export type MonitoringSessionParams = z.infer<typeof monitoringSessionParamsSchema>;
