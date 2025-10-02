-- CreateEnum
CREATE TYPE "public"."FormGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."form_generation_progress" (
    "id" UUID NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "public"."FormGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "userId" UUID NOT NULL,
    "formId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_generation_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_generation_progress_jobId_key" ON "public"."form_generation_progress"("jobId");

-- CreateIndex
CREATE INDEX "form_generation_progress_userId_idx" ON "public"."form_generation_progress"("userId");

-- CreateIndex
CREATE INDEX "form_generation_progress_formId_idx" ON "public"."form_generation_progress"("formId");

-- AddForeignKey
ALTER TABLE "public"."form_generation_progress" ADD CONSTRAINT "form_generation_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_generation_progress" ADD CONSTRAINT "form_generation_progress_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
