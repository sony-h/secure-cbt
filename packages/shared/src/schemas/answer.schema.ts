import { z } from 'zod';

const answerItemSchema = z.object({
  question_id: z.string().uuid(),
  answer_text: z.string().max(10000),
  timestamp: z.string().datetime(),
});

export const saveAnswerSchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer_text: z.string().max(10000),
  timestamp: z.string().datetime().optional(),
});

export const batchSyncAnswerSchema = z.object({
  session_id: z.string().uuid(),
  answers: z.array(answerItemSchema).min(1).max(500),
});

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type BatchSyncAnswerInput = z.infer<typeof batchSyncAnswerSchema>;
