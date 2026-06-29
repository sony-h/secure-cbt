-- Add soft-delete columns to academic entities

ALTER TABLE "academic_years" ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "majors" ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "subjects" ADD COLUMN "deleted_at" TIMESTAMPTZ;
