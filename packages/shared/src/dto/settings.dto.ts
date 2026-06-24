// ============================================================
// Settings DTOs
// ============================================================

export interface UpdateSettingsDto {
  warning_limit?: number;
  auto_submit_enabled?: boolean;
  fullscreen_required?: boolean;
  lock_task_mode?: boolean;
  autosave_interval?: number;
  session_timeout?: number;
}

export interface SettingsResponseDto {
  id: string;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
  lock_task_mode: boolean;
  autosave_interval: number;
  session_timeout: number;
  updated_at: string;
}
