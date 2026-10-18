-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "show_results" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "plain_password" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "can_monitor_all_subjects" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "nip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_invites" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "subject_ids" JSONB,
    "can_monitor_all_subjects" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_identifier_type_idx" ON "verification_tokens"("identifier", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_token_hash_idx" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_invites_email_key" ON "teacher_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_invites_token_hash_key" ON "teacher_invites"("token_hash");

-- CreateIndex
CREATE INDEX "teacher_invites_email_idx" ON "teacher_invites"("email");

-- CreateIndex
CREATE INDEX "teacher_invites_token_hash_idx" ON "teacher_invites"("token_hash");
