import { z } from 'zod';
import { QuestionType, DifficultyLevel } from '../enums';

export const importQuestionOptionSchema = z.object({
  order: z.number().int().min(1),
  content: z.string().min(1, { message: 'Konten pilihan tidak boleh kosong' }),
  image_url: z.string().nullable().optional(),
  is_correct: z.boolean(),
});

export const importQuestionItemSchema = z
  .object({
    number: z.number().int().optional(),
    content: z.string().min(1, { message: 'Konten pertanyaan tidak boleh kosong' }),
    image_url: z.string().nullable().optional(),
    type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    explanation: z.string().nullable().optional(),
    options: z.array(importQuestionOptionSchema).default([]),
    valid: z.boolean().default(true),
    error: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === QuestionType.ESSAY) {
      return;
    }
    if (data.type === QuestionType.SHORT_ANSWER) {
      if (!data.options || data.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Soal isian singkat memerlukan minimal 1 kunci jawaban valid',
          path: ['options'],
        });
      }
      return;
    }
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimal 2 opsi pilihan jawaban',
        path: ['options'],
      });
    }
  });

export const previewImportQuestionsResponseSchema = z.object({
  total_questions: z.number().int(),
  valid_count: z.number().int(),
  invalid_count: z.number().int(),
  questions: z.array(importQuestionItemSchema),
});

export const confirmImportQuestionItemSchema = z
  .object({
    content: z.string().min(1, { message: 'Konten pertanyaan wajib diisi' }),
    image_url: z.string().nullable().optional(),
    type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    explanation: z.string().nullable().optional(),
    options: z.array(importQuestionOptionSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === QuestionType.ESSAY) {
      return;
    }
    if (data.type === QuestionType.SHORT_ANSWER) {
      if (!data.options || data.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Soal isian singkat memerlukan minimal 1 kunci jawaban valid',
          path: ['options'],
        });
      }
      return;
    }
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pilihan jawaban minimal 2 opsi',
        path: ['options'],
      });
      return;
    }

    if (data.type === QuestionType.MATCHING) {
      for (let i = 0; i < data.options.length; i++) {
        const opt = data.options[i];
        if (!opt) continue;
        try {
          const parsed = JSON.parse(opt.content);
          if (!parsed.left || !parsed.right) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Pasangan opsi ke-${i + 1} tidak lengkap`,
              path: ['options', i, 'content'],
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Format pasangan opsi ke-${i + 1} tidak valid`,
            path: ['options', i, 'content'],
          });
        }
      }
      return;
    }

    // MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE
    if (!data.options.some((o) => o.is_correct)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimal 1 opsi harus ditandai sebagai kunci jawaban benar',
        path: ['options'],
      });
    }
  });

export const confirmImportQuestionsSchema = z.object({
  bank_id: z.string().uuid({ message: 'ID bank soal harus berupa UUID valid' }),
  questions: z
    .array(confirmImportQuestionItemSchema)
    .min(1, { message: 'Minimal 1 soal untuk diimpor' }),
});

export type ImportQuestionOptionInput = z.infer<typeof importQuestionOptionSchema>;
export type ImportQuestionItemInput = z.infer<typeof importQuestionItemSchema>;
export type ConfirmImportQuestionItemInput = z.infer<typeof confirmImportQuestionItemSchema>;
export type PreviewImportQuestionsResponse = z.infer<typeof previewImportQuestionsResponseSchema>;
export type ConfirmImportQuestionsInput = z.infer<typeof confirmImportQuestionsSchema>;
