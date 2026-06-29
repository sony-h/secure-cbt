import { z } from 'zod';
import { StudentStatus } from '../enums';

export const createStudentSchema = z.object({
  nis: z.string().min(1, { message: 'NIS wajib diisi' }).max(30, { message: 'NIS maksimal 30 karakter' }),
  full_name: z.string().min(1, { message: 'Nama wajib diisi' }).max(200, { message: 'Nama maksimal 200 karakter' }),
  class_id: z.string().uuid({ message: 'ID kelas tidak valid' }),
});

export const updateStudentSchema = z.object({
  nis: z.string().min(1, { message: 'NIS wajib diisi' }).max(30, { message: 'NIS maksimal 30 karakter' }).optional(),
  full_name: z.string().min(1, { message: 'Nama wajib diisi' }).max(200, { message: 'Nama maksimal 200 karakter' }).optional(),
  class_id: z.string().uuid({ message: 'ID kelas tidak valid' }).optional(),
  status: z.nativeEnum(StudentStatus, { errorMap: () => ({ message: 'Status tidak valid' }) }).optional(),
});

export const importStudentRowSchema = z.object({
  nis: z.string().min(1, { message: 'NIS wajib diisi' }),
  full_name: z.string().min(1, { message: 'Nama wajib diisi' }),
  class_name: z.string().min(1, { message: 'Nama kelas wajib diisi' }),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const importStudentsSchema = z.object({
  students: z.array(importStudentRowSchema).min(1, { message: 'Minimal 1 siswa' }).max(1000, { message: 'Maksimal 1000 siswa' }),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ImportStudentInput = z.infer<typeof importStudentsSchema>;
export type ImportStudentRowInput = z.infer<typeof importStudentRowSchema>;
