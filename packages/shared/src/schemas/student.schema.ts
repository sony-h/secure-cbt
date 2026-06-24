import { z } from 'zod';
import { StudentStatus } from '../enums';

export const createStudentSchema = z.object({
  nis: z.string().min(1).max(30),
  full_name: z.string().min(1).max(200),
  class_id: z.string().uuid(),
});

export const updateStudentSchema = z.object({
  nis: z.string().min(1).max(30).optional(),
  full_name: z.string().min(1).max(200).optional(),
  class_id: z.string().uuid().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
});

export const importStudentRowSchema = z.object({
  nis: z.string().min(1),
  full_name: z.string().min(1),
  class_name: z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const importStudentsSchema = z.object({
  students: z.array(importStudentRowSchema).min(1).max(1000),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ImportStudentInput = z.infer<typeof importStudentsSchema>;
