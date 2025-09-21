-- AlterTable
ALTER TABLE "public"."ap_completed_forms" ADD COLUMN     "applicantNotificationContent" TEXT,
ADD COLUMN     "applicantViewFormAfterCompletion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editApplicationStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyApplicant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."processed_applications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "applicantProcessId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "formRoleIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processed_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_applications_userId_idx" ON "public"."processed_applications"("userId");

-- CreateIndex
CREATE INDEX "processed_applications_processId_idx" ON "public"."processed_applications"("processId");

-- CreateIndex
CREATE INDEX "processed_applications_applicantProcessId_idx" ON "public"."processed_applications"("applicantProcessId");

-- AddForeignKey
ALTER TABLE "public"."processed_applications" ADD CONSTRAINT "processed_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processed_applications" ADD CONSTRAINT "processed_applications_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processed_applications" ADD CONSTRAINT "processed_applications_applicantProcessId_fkey" FOREIGN KEY ("applicantProcessId") REFERENCES "public"."applicant_processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
