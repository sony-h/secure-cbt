-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MAIN', 'REMEDIAL');

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "session_type" "SessionType" NOT NULL DEFAULT 'MAIN',
ADD COLUMN "is_remedial_allowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reopened_at" TIMESTAMP(3),
ADD COLUMN "reopened_by" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "exam_sessions_exam_id_student_id_attempt_number_key" ON "exam_sessions"("exam_id", "student_id", "attempt_number");

-- AlterTable
ALTER TABLE "scores" ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "session_type" "SessionType" NOT NULL DEFAULT 'MAIN';
