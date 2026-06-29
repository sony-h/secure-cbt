-- Add performance indexes for frequently queried columns

CREATE INDEX IF NOT EXISTS "session_logs_exam_session_id_idx" ON "session_logs" ("exam_session_id");

CREATE INDEX IF NOT EXISTS "exam_sessions_status_idx" ON "exam_sessions" ("status");

CREATE INDEX IF NOT EXISTS "questions_question_bank_id_idx" ON "questions" ("question_bank_id");

CREATE INDEX IF NOT EXISTS "question_options_question_id_idx" ON "question_options" ("question_id");

CREATE INDEX IF NOT EXISTS "scores_exam_session_id_idx" ON "scores" ("exam_session_id");
