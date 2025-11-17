-- CreateEnum
CREATE TYPE "public"."CertificateValidityType" AS ENUM ('FOREVER', 'FIXED_YEARS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."CertificateFieldType" AS ENUM ('NAME', 'CERT_NUMBER', 'ISSUE_DATE', 'EXPIRY_DATE', 'QR_CODE', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."certificate_templates" (
    "id" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "templateFileUrl" VARCHAR(255) NOT NULL,
    "certificateNumberFormat" JSONB NOT NULL,
    "approvalCondition" JSONB NOT NULL,
    "enableCertificateGeneration" BOOLEAN NOT NULL DEFAULT false,
    "validityType" "public"."CertificateValidityType" NOT NULL DEFAULT 'FOREVER',
    "validityYears" INTEGER,
    "customValidityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificate_field_mappings" (
    "id" UUID NOT NULL,
    "certificateTemplateId" UUID NOT NULL,
    "fieldType" "public"."CertificateFieldType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "fontSize" DOUBLE PRECISION,
    "fontFamily" TEXT,
    "color" TEXT,
    "alignment" TEXT,
    "sourceFormId" UUID,
    "sourceQuestionId" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" UUID NOT NULL,
    "certificateTemplateId" UUID NOT NULL,
    "applicantProcessId" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationCode" UUID NOT NULL,
    "fileUrl" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" UUID NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_processId_idx" ON "public"."certificate_templates"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_processId_key" ON "public"."certificate_templates"("processId");

-- CreateIndex
CREATE INDEX "certificate_field_mappings_certificateTemplateId_idx" ON "public"."certificate_field_mappings"("certificateTemplateId");

-- CreateIndex
CREATE INDEX "certificate_field_mappings_sourceFormId_idx" ON "public"."certificate_field_mappings"("sourceFormId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationCode_key" ON "public"."certificates"("verificationCode");

-- CreateIndex
CREATE INDEX "certificates_certificateTemplateId_idx" ON "public"."certificates"("certificateTemplateId");

-- CreateIndex
CREATE INDEX "certificates_applicantProcessId_idx" ON "public"."certificates"("applicantProcessId");

-- CreateIndex
CREATE INDEX "certificates_verificationCode_idx" ON "public"."certificates"("verificationCode");

-- AddForeignKey
ALTER TABLE "public"."certificate_templates" ADD CONSTRAINT "certificate_templates_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificate_field_mappings" ADD CONSTRAINT "certificate_field_mappings_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "public"."certificate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificate_field_mappings" ADD CONSTRAINT "certificate_field_mappings_sourceFormId_fkey" FOREIGN KEY ("sourceFormId") REFERENCES "public"."forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "public"."certificate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_applicantProcessId_fkey" FOREIGN KEY ("applicantProcessId") REFERENCES "public"."applicant_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
