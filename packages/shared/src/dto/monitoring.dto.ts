// ============================================================
// Monitoring DTOs
// ============================================================

export interface MonitoringExamDto {
  exam_id: string;
  title: string;
  total_students: number;
  online_count: number;
  disconnected_count: number;
  finished_count: number;
  warned_count: number;
}

export interface MonitoringStudentDto {
  session_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  status: 'active' | 'idle' | 'disconnected';
  progress: {
    answered: number;
    total: number;
  };
  remaining_time_seconds: number;
  warning_count: number;
  last_activity_at: string;
}

export interface SessionLogDto {
  id: string;
  session_id: string;
  event: string;
  description: string;
  timestamp: string;
}
