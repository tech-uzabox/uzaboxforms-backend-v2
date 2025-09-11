/*
  Warnings:

  - A unique constraint covering the columns `[formId,applicantProcessId]` on the table `form_responses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `processId` to the `form_responses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ManagementType" AS ENUM ('HEADER', 'FOOTER');

-- CreateEnum
CREATE TYPE "public"."AddToDatabaseStatus" AS ENUM ('ENABLED', 'DISABLED');

-- AlterTable
ALTER TABLE "public"."form_responses" ADD COLUMN     "processId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "public"."otps" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."management" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "type" "public"."ManagementType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."add_to_databases" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."AddToDatabaseStatus" NOT NULL DEFAULT 'ENABLED',
    "levels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_to_databases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_email_idx" ON "public"."otps"("email");

-- CreateIndex
CREATE INDEX "form_responses_processId_idx" ON "public"."form_responses"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "form_responses_formId_applicantProcessId_key" ON "public"."form_responses"("formId", "applicantProcessId");

-- AddForeignKey
ALTER TABLE "public"."form_responses" ADD CONSTRAINT "form_responses_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
