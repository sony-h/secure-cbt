import { z } from 'zod';

export const updateSettingsSchema = z.object({
  warning_limit: z.number().int().min(1).max(10).optional(),
  auto_submit_enabled: z.boolean().optional(),
  fullscreen_required: z.boolean().optional(),
  lock_task_mode: z.boolean().optional(),
  autosave_interval: z.number().int().min(1).max(60).optional(),
  session_timeout: z.number().int().min(5).max(120).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
