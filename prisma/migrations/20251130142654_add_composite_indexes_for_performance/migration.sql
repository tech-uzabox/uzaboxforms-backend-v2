-- CreateIndex
CREATE INDEX "ap_completed_forms_applicantProcessId_createdAt_idx" ON "public"."ap_completed_forms"("applicantProcessId", "createdAt");

-- CreateIndex
CREATE INDEX "ap_completed_forms_applicantProcessId_formId_idx" ON "public"."ap_completed_forms"("applicantProcessId", "formId");

-- CreateIndex
CREATE INDEX "organization_users_userId_superiorId_idx" ON "public"."organization_users"("userId", "superiorId");
