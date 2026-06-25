import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  name: z.string().min(1).max(50),
  is_active: z.boolean().optional(),
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  is_active: z.boolean().optional(),
});

export const createMajorSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
});

export const updateMajorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).optional(),
});

export const createClassSchema = z.object({
  name: z.string().min(1).max(50),
  major_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  grade_level: z.number().int().min(10).max(12),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  major_id: z.string().uuid().optional(),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type CreateMajorInput = z.infer<typeof createMajorSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
