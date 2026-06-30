import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  name: z.string().min(1, { message: 'Nama tahun ajaran wajib diisi' }).max(50, { message: 'Nama tahun ajaran maksimal 50 karakter' }),
  is_active: z.boolean().optional(),
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(1, { message: 'Nama tahun ajaran wajib diisi' }).max(50, { message: 'Nama tahun ajaran maksimal 50 karakter' }).optional(),
  is_active: z.boolean().optional(),
});

export const createMajorSchema = z.object({
  name: z.string().min(1, { message: 'Nama jurusan wajib diisi' }).max(100, { message: 'Nama jurusan maksimal 100 karakter' }),
  code: z.string().min(1, { message: 'Kode jurusan wajib diisi' }).max(10, { message: 'Kode jurusan maksimal 10 karakter' }),
});

export const updateMajorSchema = z.object({
  name: z.string().min(1, { message: 'Nama jurusan wajib diisi' }).max(100, { message: 'Nama jurusan maksimal 100 karakter' }).optional(),
  code: z.string().min(1, { message: 'Kode jurusan wajib diisi' }).max(10, { message: 'Kode jurusan maksimal 10 karakter' }).optional(),
});

export const createClassSchema = z.object({
  name: z.string().min(1, { message: 'Nama kelas wajib diisi' }).max(50, { message: 'Nama kelas maksimal 50 karakter' }),
  major_id: z.string().uuid({ message: 'ID jurusan tidak valid' }),
  academic_year_id: z.string().uuid({ message: 'ID tahun ajaran tidak valid' }),
  grade_level: z.number().int().min(10, { message: 'Minimal kelas 10' }).max(12, { message: 'Maksimal kelas 12' }),
});

export const updateClassSchema = z.object({
  name: z.string().min(1, { message: 'Nama kelas wajib diisi' }).max(50, { message: 'Nama kelas maksimal 50 karakter' }).optional(),
  grade_level: z.number().int().min(10, { message: 'Minimal kelas 10' }).max(13, { message: 'Maksimal kelas 13' }).optional(),
  major_id: z.string().uuid({ message: 'ID jurusan tidak valid' }).optional().nullable(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, { message: 'Nama mata pelajaran wajib diisi' }).max(200, { message: 'Nama mata pelajaran maksimal 200 karakter' }),
  code: z.string().min(1, { message: 'Kode mata pelajaran wajib diisi' }).max(20, { message: 'Kode mata pelajaran maksimal 20 karakter' }),
  major_id: z.string().uuid({ message: 'ID jurusan tidak valid' }).optional(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1, { message: 'Nama mata pelajaran wajib diisi' }).max(200, { message: 'Nama mata pelajaran maksimal 200 karakter' }).optional(),
  code: z.string().min(1, { message: 'Kode mata pelajaran wajib diisi' }).max(20, { message: 'Kode mata pelajaran maksimal 20 karakter' }).optional(),
  major_id: z.string().uuid({ message: 'ID jurusan tidak valid' }).optional().nullable(),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type CreateMajorInput = z.infer<typeof createMajorSchema>;
export type UpdateMajorInput = z.infer<typeof updateMajorSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
