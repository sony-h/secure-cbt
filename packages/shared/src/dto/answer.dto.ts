// ============================================================
// Answer DTOs
// ============================================================

export interface SaveAnswerDto {
  session_id: string;
  question_id: string;
  answer_text: string;
  timestamp?: string;
}

export interface BatchSyncAnswerDto {
  session_id: string;
  answers: {
    question_id: string;
    answer_text: string;
    timestamp: string;
  }[];
}

export interface AnswerResponseDto {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  answered_at: string;
  synced_at?: string;
  is_synced: boolean;
}

export interface SyncStatusDto {
  total_answers: number;
  synced_answers: number;
  pending_answers: number;
  last_synced_at?: string;
}
