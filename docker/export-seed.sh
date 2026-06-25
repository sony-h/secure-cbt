#!/bin/sh
DB="secure_cbt"
USER="postgres"
TABLES="settings academic_years majors subjects classes users teachers students teacher_subjects question_banks questions question_options question_tags exams exam_tokens exam_packages exam_questions exam_classes exam_sessions session_logs answers scores refresh_tokens"

for table in $TABLES; do
  pg_dump -U $USER -d $DB --table="$table" --data-only --inserts --rows-per-insert=1 --no-comments --no-owner --no-privileges 2>/dev/null \
    | grep -v -E '^--|^$|^SET |^SELECT pg_catalog|^\\\.'
done
