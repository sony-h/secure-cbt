import { z } from 'zod';
import { DifficultyLevel, QuestionType } from '../enums';

const optionSchema = z.object({
  content: z.string().max(2000, { message: 'Konten pilihan maksimal 2000 karakter' }).default(''),
  image_url: z.string().nullable().optional(),
  is_correct: z.boolean().default(false),
});

export const createQuestionSchema = z.object({
  question_bank_id: z.string().uuid({ message: 'ID bank soal tidak valid' }),
  type: z.nativeEnum(QuestionType, { errorMap: () => ({ message: 'Tipe soal tidak valid' }) }),
  content: z.string().min(1, { message: 'Konten soal wajib diisi' }).max(10000, { message: 'Konten soal maksimal 10000 karakter' }),
  image_url: z.string().nullable().optional(),
  difficulty: z.nativeEnum(DifficultyLevel, { errorMap: () => ({ message: 'Tingkat kesulitan tidak valid' }) }),
  explanation: z.string().max(5000, { message: 'Penjelasan maksimal 5000 karakter' }).optional().nullable(),
  options: z.array(optionSchema).default([]),
  tags: z.array(z.string().max(50, { message: 'Tag maksimal 50 karakter' })).max(20, { message: 'Maksimal 20 tag' }).optional(),
}).superRefine((data, ctx) => {
  if (data.type === QuestionType.SHORT_ANSWER && data.options.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'Soal isian singkat minimal memerlukan 1 kunci jawaban',
    });
  } else if (
    data.type !== QuestionType.ESSAY &&
    data.type !== QuestionType.SHORT_ANSWER &&
    data.options.length < 2
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'Soal minimal memerlukan 2 pilihan jawaban atau pasangan',
    });
  }
});

const updateOptionSchema = z.object({
  id: z.string().uuid({ message: 'ID opsi tidak valid' }).optional(),
  content: z.string().max(2000, { message: 'Konten pilihan maksimal 2000 karakter' }).default(''),
  image_url: z.string().nullable().optional(),
  is_correct: z.boolean().default(false),
});

export const updateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType, { errorMap: () => ({ message: 'Tipe soal tidak valid' }) }).optional(),
  content: z.string().min(1, { message: 'Konten soal wajib diisi' }).max(10000, { message: 'Konten soal maksimal 10000 karakter' }).optional(),
  image_url: z.string().nullable().optional(),
  difficulty: z.nativeEnum(DifficultyLevel, { errorMap: () => ({ message: 'Tingkat kesulitan tidak valid' }) }).optional(),
  explanation: z.string().max(5000, { message: 'Penjelasan maksimal 5000 karakter' }).optional().nullable(),
  options: z.array(updateOptionSchema).optional(),
  tags: z.array(z.string().max(50, { message: 'Tag maksimal 50 karakter' })).max(20, { message: 'Maksimal 20 tag' }).optional(),
});

export const createQuestionBankSchema = z.object({
  title: z.string().min(1, { message: 'Judul bank soal wajib diisi' }).max(200, { message: 'Judul bank soal maksimal 200 karakter' }),
  subject_id: z.string().uuid({ message: 'ID mata pelajaran tidak valid' }),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
