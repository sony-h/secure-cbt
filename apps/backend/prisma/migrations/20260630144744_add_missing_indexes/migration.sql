-- CreateIndex
CREATE INDEX "academic_years_is_active_idx" ON "academic_years"("is_active");

-- CreateIndex
CREATE INDEX "academic_years_deleted_at_idx" ON "academic_years"("deleted_at");

-- CreateIndex
CREATE INDEX "exam_classes_exam_id_idx" ON "exam_classes"("exam_id");

-- CreateIndex
CREATE INDEX "exam_classes_class_id_idx" ON "exam_classes"("class_id");

-- CreateIndex
CREATE INDEX "exam_sessions_student_id_status_idx" ON "exam_sessions"("student_id", "status");

-- CreateIndex
CREATE INDEX "exam_tokens_expires_at_idx" ON "exam_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE INDEX "exams_start_at_idx" ON "exams"("start_at");

-- CreateIndex
CREATE INDEX "exams_end_at_idx" ON "exams"("end_at");

-- CreateIndex
CREATE INDEX "exams_subject_id_idx" ON "exams"("subject_id");

-- CreateIndex
CREATE INDEX "exams_teacher_id_idx" ON "exams"("teacher_id");

-- CreateIndex
CREATE INDEX "exams_deleted_at_idx" ON "exams"("deleted_at");

-- CreateIndex
CREATE INDEX "question_tags_tag_idx" ON "question_tags"("tag");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "students_deleted_at_idx" ON "students"("deleted_at");

-- CreateIndex
CREATE INDEX "teacher_subjects_teacher_id_idx" ON "teacher_subjects"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_subject_id_idx" ON "teacher_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "teachers_deleted_at_idx" ON "teachers"("deleted_at");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
