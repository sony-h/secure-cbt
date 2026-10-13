import { z } from 'zod';
import { QuestionType, DifficultyLevel } from '../enums';

export const importQuestionOptionSchema = z.object({
  order: z.number().int().min(1),
  content: z.string().min(1, { message: 'Konten pilihan tidak boleh kosong' }),
  image_url: z.string().nullable().optional(),
  is_correct: z.boolean(),
});

export const importQuestionItemSchema = z.object({
  number: z.number().int().optional(),
  content: z.string().min(1, { message: 'Konten pertanyaan tidak boleh kosong' }),
  image_url: z.string().nullable().optional(),
  type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  explanation: z.string().nullable().optional(),
  options: z.array(importQuestionOptionSchema).min(2, { message: 'Minimal 2 opsi pilihan' }),
  valid: z.boolean().default(true),
  error: z.string().nullable().optional(),
});

export const previewImportQuestionsResponseSchema = z.object({
  total_questions: z.number().int(),
  valid_count: z.number().int(),
  invalid_count: z.number().int(),
  questions: z.array(importQuestionItemSchema),
});

export const confirmImportQuestionsSchema = z.object({
  bank_id: z.string().uuid({ message: 'ID bank soal harus berupa UUID valid' }),
  questions: z.array(
    z.object({
      content: z.string().min(1, { message: 'Konten pertanyaan wajib diisi' }),
      image_url: z.string().nullable().optional(),
      type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
      difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
      explanation: z.string().nullable().optional(),
      options: z.array(importQuestionOptionSchema).min(2, { message: 'Pilihan jawaban minimal 2 opsi' }),
    }),
  ).min(1, { message: 'Minimal 1 soal untuk diimpor' }),
});

export type ImportQuestionOptionInput = z.infer<typeof importQuestionOptionSchema>;
export type ImportQuestionItemInput = z.infer<typeof importQuestionItemSchema>;
export type PreviewImportQuestionsResponse = z.infer<typeof previewImportQuestionsResponseSchema>;
export type ConfirmImportQuestionsInput = z.infer<typeof confirmImportQuestionsSchema>;
