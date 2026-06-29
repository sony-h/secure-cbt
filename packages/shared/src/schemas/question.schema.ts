import { z } from 'zod';
import { DifficultyLevel, QuestionType } from '../enums';

const optionSchema = z.object({
  content: z.string().min(1, { message: 'Konten pilihan wajib diisi' }).max(2000, { message: 'Konten pilihan maksimal 2000 karakter' }),
  is_correct: z.boolean(),
});

export const createQuestionSchema = z.object({
  question_bank_id: z.string().uuid({ message: 'ID bank soal tidak valid' }),
  type: z.nativeEnum(QuestionType, { errorMap: () => ({ message: 'Tipe soal tidak valid' }) }),
  content: z.string().min(1, { message: 'Konten soal wajib diisi' }).max(10000, { message: 'Konten soal maksimal 10000 karakter' }),
  difficulty: z.nativeEnum(DifficultyLevel, { errorMap: () => ({ message: 'Tingkat kesulitan tidak valid' }) }),
  explanation: z.string().max(5000, { message: 'Penjelasan maksimal 5000 karakter' }).optional(),
  options: z.array(optionSchema).min(2, { message: 'Minimal 2 pilihan jawaban' }).max(10, { message: 'Maksimal 10 pilihan jawaban' }),
  tags: z.array(z.string().max(50, { message: 'Tag maksimal 50 karakter' })).max(20, { message: 'Maksimal 20 tag' }).optional(),
});

const updateOptionSchema = z.object({
  id: z.string().uuid({ message: 'ID opsi tidak valid' }).optional(),
  content: z.string().min(1, { message: 'Konten pilihan wajib diisi' }).max(2000, { message: 'Konten pilihan maksimal 2000 karakter' }),
  is_correct: z.boolean(),
});

export const updateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType, { errorMap: () => ({ message: 'Tipe soal tidak valid' }) }).optional(),
  content: z.string().min(1, { message: 'Konten soal wajib diisi' }).max(10000, { message: 'Konten soal maksimal 10000 karakter' }).optional(),
  difficulty: z.nativeEnum(DifficultyLevel, { errorMap: () => ({ message: 'Tingkat kesulitan tidak valid' }) }).optional(),
  explanation: z.string().max(5000, { message: 'Penjelasan maksimal 5000 karakter' }).optional(),
  options: z.array(updateOptionSchema).min(2, { message: 'Minimal 2 pilihan jawaban' }).max(10, { message: 'Maksimal 10 pilihan jawaban' }).optional(),
  tags: z.array(z.string().max(50, { message: 'Tag maksimal 50 karakter' })).max(20, { message: 'Maksimal 20 tag' }).optional(),
});

export const createQuestionBankSchema = z.object({
  title: z.string().min(1, { message: 'Judul bank soal wajib diisi' }).max(200, { message: 'Judul bank soal maksimal 200 karakter' }),
  subject_id: z.string().uuid({ message: 'ID mata pelajaran tidak valid' }),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
