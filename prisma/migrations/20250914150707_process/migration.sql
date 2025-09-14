-- AlterTable
ALTER TABLE "public"."process_forms" ADD COLUMN     "applicantViewFormAfterCompletion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editApplicationStatus" BOOLEAN NOT NULL DEFAULT false;
