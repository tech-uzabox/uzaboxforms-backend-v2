-- AlterTable
ALTER TABLE "public"."ap_completed_forms" ADD COLUMN     "nextStaffId" UUID,
ADD COLUMN     "nextStepRoles" TEXT[],
ADD COLUMN     "nextStepSpecifiedTo" TEXT,
ADD COLUMN     "nextStepType" "public"."NextStepType" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "notificationComment" TEXT,
ADD COLUMN     "notificationToId" UUID,
ADD COLUMN     "notificationToRoles" TEXT[],
ADD COLUMN     "notificationType" "public"."NextStepType" NOT NULL DEFAULT 'NOT_APPLICABLE';

-- AlterTable
ALTER TABLE "public"."management" ADD COLUMN     "fileUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."process_forms" ADD COLUMN     "nextStepSpecifiedTo" TEXT;
