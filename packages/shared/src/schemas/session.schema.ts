import { z } from 'zod';

export const startSessionSchema = z.object({
  token: z.string().min(4).max(20),
  device_id: z.string().max(255),
});

export const resumeSessionSchema = z.object({
  session_id: z.string().uuid(),
});

export const submitSessionSchema = z.object({
  session_id: z.string().uuid(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ResumeSessionInput = z.infer<typeof resumeSessionSchema>;
export type SubmitSessionInput = z.infer<typeof submitSessionSchema>;
