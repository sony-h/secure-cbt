-- AlterTable
ALTER TABLE "questions" ADD COLUMN "audio_url" TEXT,
ADD COLUMN "audio_play_limit" INTEGER DEFAULT 2;

-- AlterTable
ALTER TABLE "exams" ADD COLUMN "violation_vibration_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "violation_alarm_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "violation_alarm_duration_seconds" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "violation_alarm_sound" TEXT NOT NULL DEFAULT 'sharp_beep';
