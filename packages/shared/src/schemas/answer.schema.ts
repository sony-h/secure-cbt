import { z } from 'zod';

const answerItemSchema = z.object({
  question_id: z.string().uuid({ message: 'ID soal tidak valid' }),
  answer_text: z.string().max(10000, { message: 'Jawaban maksimal 10000 karakter' }),
  timestamp: z.string().datetime({ message: 'Format tanggal tidak valid' }),
});

export const saveAnswerSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  question_id: z.string().uuid({ message: 'ID soal tidak valid' }),
  answer_text: z.string().max(10000, { message: 'Jawaban maksimal 10000 karakter' }),
  timestamp: z.string().datetime({ message: 'Format tanggal tidak valid' }).optional(),
});

export const batchSyncAnswerSchema = z.object({
  session_id: z.string().uuid({ message: 'ID sesi tidak valid' }),
  answers: z.array(answerItemSchema).min(1, { message: 'Minimal 1 jawaban' }).max(500, { message: 'Maksimal 500 jawaban' }),
});

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type BatchSyncAnswerInput = z.infer<typeof batchSyncAnswerSchema>;
