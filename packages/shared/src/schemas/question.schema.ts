import { z } from 'zod';
import { DifficultyLevel, QuestionType } from '../enums';

const optionSchema = z.object({
  content: z.string().min(1).max(2000),
  is_correct: z.boolean(),
});

export const createQuestionSchema = z.object({
  question_bank_id: z.string().uuid(),
  type: z.nativeEnum(QuestionType),
  content: z.string().min(1).max(10000),
  difficulty: z.nativeEnum(DifficultyLevel),
  explanation: z.string().max(5000).optional(),
  options: z.array(optionSchema).min(2).max(10),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const updateOptionSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  is_correct: z.boolean(),
});

export const updateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType).optional(),
  content: z.string().min(1).max(10000).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  explanation: z.string().max(5000).optional(),
  options: z.array(updateOptionSchema).min(2).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const createQuestionBankSchema = z.object({
  title: z.string().min(1).max(200),
  subject_id: z.string().uuid(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
