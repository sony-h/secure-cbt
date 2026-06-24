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

export interface ClassScoreDto {
  class_id: string;
  class_name: string;
  exam_id: string;
  exam_title: string;
  student_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
}
