// ============================================================
// Report DTOs
// ============================================================

export interface ReportRequestDto {
  exam_id?: string;
  class_id?: string;
  format: 'pdf' | 'excel';
}

export interface StudentScoreReportDto {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  status: 'passed' | 'failed';
}

export interface ExamReportDto {
  exam_id: string;
  exam_title: string;
  subject_name: string;
  total_students: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  generated_at: string;
  students: StudentScoreReportDto[];
}
