-- AlterTable
ALTER TABLE "exams" ADD COLUMN "max_attempts" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN "extra_attempts_allowed" INTEGER NOT NULL DEFAULT 0;
