import { z } from 'zod';

export const updateSettingsSchema = z.object({
  warning_limit: z.number().int().min(1, { message: 'Minimal 1 peringatan' }).max(10, { message: 'Maksimal 10 peringatan' }).optional(),
  auto_submit_enabled: z.boolean().optional(),
  fullscreen_required: z.boolean().optional(),
  lock_task_mode: z.boolean().optional(),
  autosave_interval: z.number().int().min(1, { message: 'Minimal 1 detik' }).max(60, { message: 'Maksimal 60 detik' }).optional(),
  session_timeout: z.number().int().min(5, { message: 'Minimal 5 menit' }).max(120, { message: 'Maksimal 120 menit' }).optional(),
  passing_grade: z.number().int().min(0, { message: 'Nilai minimal 0' }).max(100, { message: 'Nilai maksimal 100' }).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
