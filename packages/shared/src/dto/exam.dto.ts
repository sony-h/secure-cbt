import { ExamStatus } from '../enums';

// ============================================================
// Exam DTOs
// ============================================================

export interface CreateExamDto {
  title: string;
  description?: string;
  subject_id: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  class_ids: string[];
  question_ids: string[];
  randomize_questions?: boolean;
  randomize_answers?: boolean;
  warning_limit?: number;
  auto_submit_enabled?: boolean;
  fullscreen_required?: boolean;
  package_count?: number; // number of packages (A/B/C/D)
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration_minutes?: number;
  start_at?: string;
  end_at?: string;
  class_ids?: string[];
  question_ids?: string[];
  randomize_questions?: boolean;
  randomize_answers?: boolean;
  warning_limit?: number;
  auto_submit_enabled?: boolean;
  fullscreen_required?: boolean;
}

export interface ExamResponseDto {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  subject_name?: string;
  duration_minutes: number;
  status: ExamStatus;
  start_at: string;
  end_at: string;
  class_ids: string[];
  question_count: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamTokenDto {
  token: string;
  exam_id: string;
  exam_title: string;
  expires_at: string;
}

export interface GenerateTokenDto {
  exam_id: string;
}
