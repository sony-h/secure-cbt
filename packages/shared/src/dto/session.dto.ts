import { SessionStatus } from '../enums';

// ============================================================
// Session DTOs
// ============================================================

export interface StartSessionDto {
  token: string;
  device_id: string;
  exam_id?: string;
}

export interface ResumeSessionDto {
  session_id: string;
}

export interface SubmitSessionDto {
  session_id: string;
}

export interface SessionResponseDto {
  id: string;
  exam_id: string;
  exam_title: string;
  student_id: string;
  status: SessionStatus;
  started_at: string;
  submitted_at?: string;
  remaining_time_seconds: number;
  warning_count: number;
  total_questions: number;
  answered_count: number;
}

export interface SessionHistoryItemDto {
  id: string;
  exam_title: string;
  subject_name: string;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  submitted_at: string;
}

export interface SessionQuestionDto {
  id: string;
  position: number;
  question: {
    id: string;
    type: string;
    content: string;
    options?: { id: string; content: string }[];
  };
  student_answer?: {
    answer_text: string;
    answered_at?: string;
  };
}
