-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ENABLED', 'DISABLED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."RoleStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."GroupStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."ProcessType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."ProcessStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."FormType" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "public"."FormStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."NextStepType" AS ENUM ('STATIC', 'DYNAMIC', 'FOLLOW_ORGANIZATION_CHART', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "photo" TEXT,
    "googleId" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."RoleStatus" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "public"."RoleStatus" NOT NULL DEFAULT 'ENABLED',

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "public"."files" (
    "id" UUID NOT NULL,
    "fileUrl" VARCHAR(255) NOT NULL,
    "thumbnailUrl" TEXT,
    "size" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "title" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "fileType" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."GroupStatus" NOT NULL DEFAULT 'ENABLED',
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_roles" (
    "groupId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "public"."RoleStatus" NOT NULL DEFAULT 'ENABLED',

    CONSTRAINT "group_roles_pkey" PRIMARY KEY ("groupId","roleId")
);

-- CreateTable
CREATE TABLE "public"."processes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ProcessType" NOT NULL DEFAULT 'PRIVATE',
    "groupId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "status" "public"."ProcessStatus" NOT NULL DEFAULT 'ENABLED',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "staffViewForms" BOOLEAN NOT NULL DEFAULT false,
    "applicantViewProcessLevel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_roles" (
    "processId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "public"."RoleStatus" NOT NULL DEFAULT 'ENABLED',

    CONSTRAINT "process_roles_pkey" PRIMARY KEY ("processId","roleId")
);

-- CreateTable
CREATE TABLE "public"."forms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FormType" NOT NULL DEFAULT 'INTERNAL',
    "status" "public"."FormStatus" NOT NULL DEFAULT 'ENABLED',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "design" JSONB,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."form_responses" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "applicantProcessId" UUID NOT NULL,
    "responses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_forms" (
    "id" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "nextStepType" "public"."NextStepType" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "nextStepRoles" TEXT[],
    "nextStaffId" UUID,
    "notificationType" "public"."NextStepType" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "notificationRoles" TEXT[],
    "notificationToId" UUID,
    "notificationComment" TEXT,
    "notifyApplicant" BOOLEAN NOT NULL DEFAULT false,
    "applicantNotificationContent" TEXT,

    CONSTRAINT "process_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."applicant_processes" (
    "id" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "status" "public"."ProcessStatus" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applicant_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ap_completed_forms" (
    "id" UUID NOT NULL,
    "applicantProcessId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "reviewerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ap_completed_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_comments" (
    "id" UUID NOT NULL,
    "applicantProcessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_users" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "superiorId" UUID,
    "title" TEXT NOT NULL,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dashboards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "allowedUsers" TEXT[],
    "allowedRoles" TEXT[],
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."widgets" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "visualizationType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qr_code_documents" (
    "id" UUID NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_code_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE INDEX "files_userId_idx" ON "public"."files"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_resource_idx" ON "public"."audit_logs"("userId", "action", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "public"."groups"("name");

-- CreateIndex
CREATE INDEX "processes_groupId_idx" ON "public"."processes"("groupId");

-- CreateIndex
CREATE INDEX "processes_creatorId_idx" ON "public"."processes"("creatorId");

-- CreateIndex
CREATE INDEX "forms_creatorId_idx" ON "public"."forms"("creatorId");

-- CreateIndex
CREATE INDEX "form_responses_formId_idx" ON "public"."form_responses"("formId");

-- CreateIndex
CREATE INDEX "form_responses_applicantProcessId_idx" ON "public"."form_responses"("applicantProcessId");

-- CreateIndex
CREATE INDEX "process_forms_processId_formId_idx" ON "public"."process_forms"("processId", "formId");

-- CreateIndex
CREATE INDEX "applicant_processes_applicantId_idx" ON "public"."applicant_processes"("applicantId");

-- CreateIndex
CREATE INDEX "applicant_processes_processId_idx" ON "public"."applicant_processes"("processId");

-- CreateIndex
CREATE INDEX "ap_completed_forms_applicantProcessId_idx" ON "public"."ap_completed_forms"("applicantProcessId");

-- CreateIndex
CREATE INDEX "process_comments_applicantProcessId_idx" ON "public"."process_comments"("applicantProcessId");

-- CreateIndex
CREATE INDEX "process_comments_userId_idx" ON "public"."process_comments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_users_userId_key" ON "public"."organization_users"("userId");

-- CreateIndex
CREATE INDEX "dashboards_ownerId_idx" ON "public"."dashboards"("ownerId");

-- CreateIndex
CREATE INDEX "widgets_dashboardId_idx" ON "public"."widgets"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_code_documents_qrCodeId_key" ON "public"."qr_code_documents"("qrCodeId");

-- CreateIndex
CREATE INDEX "qr_code_documents_creatorId_idx" ON "public"."qr_code_documents"("creatorId");

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_roles" ADD CONSTRAINT "group_roles_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_roles" ADD CONSTRAINT "group_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_roles" ADD CONSTRAINT "process_roles_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_roles" ADD CONSTRAINT "process_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."forms" ADD CONSTRAINT "forms_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_responses" ADD CONSTRAINT "form_responses_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_responses" ADD CONSTRAINT "form_responses_applicantProcessId_fkey" FOREIGN KEY ("applicantProcessId") REFERENCES "public"."applicant_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_forms" ADD CONSTRAINT "process_forms_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_forms" ADD CONSTRAINT "process_forms_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applicant_processes" ADD CONSTRAINT "applicant_processes_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applicant_processes" ADD CONSTRAINT "applicant_processes_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ap_completed_forms" ADD CONSTRAINT "ap_completed_forms_applicantProcessId_fkey" FOREIGN KEY ("applicantProcessId") REFERENCES "public"."applicant_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_comments" ADD CONSTRAINT "process_comments_applicantProcessId_fkey" FOREIGN KEY ("applicantProcessId") REFERENCES "public"."applicant_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_users" ADD CONSTRAINT "organization_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_users" ADD CONSTRAINT "organization_users_superiorId_fkey" FOREIGN KEY ("superiorId") REFERENCES "public"."organization_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."widgets" ADD CONSTRAINT "widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "public"."dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
