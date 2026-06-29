import { z } from 'zod';

export const gradeEssaySchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  question_id: z.string().uuid({ message: 'ID soal tidak valid' }),
  score: z.number().min(0, { message: 'Nilai minimal 0' }).max(100, { message: 'Nilai maksimal 100' }),
  feedback: z.string().max(2000, { message: 'Umpan balik maksimal 2000 karakter' }).optional(),
});

export type GradeEssayInput = z.infer<typeof gradeEssaySchema>;
