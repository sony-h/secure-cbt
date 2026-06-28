import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subject_id: z.string().uuid(),
  duration_minutes: z.number().int().min(1).max(480),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  class_ids: z.array(z.string().uuid()).min(1),
  question_ids: z.array(z.string().uuid()).min(1),
  randomize_questions: z.boolean().optional().default(true),
  randomize_answers: z.boolean().optional().default(true),
  warning_limit: z.number().int().min(1).max(10).optional().default(3),
  auto_submit_enabled: z.boolean().optional().default(true),
  fullscreen_required: z.boolean().optional().default(true),
  package_count: z.number().int().min(1).max(10).optional().default(1),
});

export const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  class_ids: z.array(z.string().uuid()).min(1).optional(),
  question_ids: z.array(z.string().uuid()).min(1).optional(),
  package_count: z.number().int().min(1).max(10).optional(),
  randomize_questions: z.boolean().optional(),
  randomize_answers: z.boolean().optional(),
  warning_limit: z.number().int().min(1).max(10).optional(),
  auto_submit_enabled: z.boolean().optional(),
  fullscreen_required: z.boolean().optional(),
});

export const generateTokenSchema = z.object({
  exam_id: z.string().uuid(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type GenerateTokenInput = z.infer<typeof generateTokenSchema>;
