import { z } from 'zod';

export const gradeEssaySchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  feedback: z.string().max(2000).optional(),
});

export type GradeEssayInput = z.infer<typeof gradeEssaySchema>;
