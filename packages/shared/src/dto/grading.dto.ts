// ============================================================
// Grading DTOs
// ============================================================

export interface GradeEssayDto {
  session_id: string;
  question_id: string;
  score: number;
  feedback?: string;
}

export interface ScoreResultDto {
  session_id: string;
  student_id: string;
  student_name: string;
  exam_title: string;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  essay_score?: number;
  graded_at?: string;
}

export interface PendingEssayDto {
  session_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  pending_count: number;
}

export interface SessionEssayDto {
  session_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  essays: {
    question_id: string;
    question_content: string;
    answer_text: string | null;
    score: number | null;
    feedback: string | null;
  }[];
}

export interface ClassScoreDto {
  class_id: string;
  class_name: string;
  exam_id: string;
  average_score: number;
  highest_score: number;
  lowest_score: number;
}
