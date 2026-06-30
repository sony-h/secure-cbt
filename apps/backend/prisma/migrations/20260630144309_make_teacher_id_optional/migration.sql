-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "question_banks" DROP CONSTRAINT "question_banks_teacher_id_fkey";

-- AlterTable
ALTER TABLE "academic_years" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "majors" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "question_banks" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
