import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(1, { message: 'Judul ujian wajib diisi' }).max(200, { message: 'Judul ujian maksimal 200 karakter' }),
  description: z.string().max(2000, { message: 'Deskripsi maksimal 2000 karakter' }).optional(),
  subject_id: z.string().uuid({ message: 'ID mata pelajaran tidak valid' }),
  duration_minutes: z.number().int().min(1, { message: 'Durasi minimal 1 menit' }).max(480, { message: 'Durasi maksimal 480 menit' }),
  start_at: z.string().datetime({ message: 'Format tanggal mulai tidak valid' }),
  end_at: z.string().datetime({ message: 'Format tanggal selesai tidak valid' }),
  class_ids: z.array(z.string().uuid({ message: 'ID kelas tidak valid' })).min(1, { message: 'Pilih minimal 1 kelas' }),
  question_ids: z.array(z.string().uuid({ message: 'ID soal tidak valid' })).min(1, { message: 'Pilih minimal 1 soal' }),
  randomize_questions: z.boolean().optional().default(true),
  randomize_answers: z.boolean().optional().default(true),
  warning_limit: z.number().int().min(1, { message: 'Minimal 1 peringatan' }).max(10, { message: 'Maksimal 10 peringatan' }).optional().default(3),
  auto_submit_enabled: z.boolean().optional().default(true),
  fullscreen_required: z.boolean().optional().default(true),
  package_count: z.number().int().min(1, { message: 'Minimal 1 paket' }).max(10, { message: 'Maksimal 10 paket' }).optional().default(1),
});

export const updateExamSchema = z.object({
  title: z.string().min(1, { message: 'Judul ujian wajib diisi' }).max(200, { message: 'Judul ujian maksimal 200 karakter' }).optional(),
  description: z.string().max(2000, { message: 'Deskripsi maksimal 2000 karakter' }).optional(),
  duration_minutes: z.number().int().min(1, { message: 'Durasi minimal 1 menit' }).max(480, { message: 'Durasi maksimal 480 menit' }).optional(),
  start_at: z.string().datetime({ message: 'Format tanggal mulai tidak valid' }).optional(),
  end_at: z.string().datetime({ message: 'Format tanggal selesai tidak valid' }).optional(),
  class_ids: z.array(z.string().uuid({ message: 'ID kelas tidak valid' })).min(1, { message: 'Pilih minimal 1 kelas' }).optional(),
  question_ids: z.array(z.string().uuid({ message: 'ID soal tidak valid' })).min(1, { message: 'Pilih minimal 1 soal' }).optional(),
  package_count: z.number().int().min(1, { message: 'Minimal 1 paket' }).max(10, { message: 'Maksimal 10 paket' }).optional(),
  randomize_questions: z.boolean().optional(),
  randomize_answers: z.boolean().optional(),
  warning_limit: z.number().int().min(1, { message: 'Minimal 1 peringatan' }).max(10, { message: 'Maksimal 10 peringatan' }).optional(),
  auto_submit_enabled: z.boolean().optional(),
  fullscreen_required: z.boolean().optional(),
});

export const generateTokenSchema = z.object({
  exam_id: z.string().uuid({ message: 'ID ujian tidak valid' }),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type GenerateTokenInput = z.infer<typeof generateTokenSchema>;
