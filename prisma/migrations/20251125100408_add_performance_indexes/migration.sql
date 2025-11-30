-- CreateIndex
CREATE INDEX "ap_completed_forms_reviewerId_idx" ON "public"."ap_completed_forms"("reviewerId");

-- CreateIndex
CREATE INDEX "ap_completed_forms_formId_idx" ON "public"."ap_completed_forms"("formId");

-- CreateIndex
CREATE INDEX "applicant_processes_processId_status_idx" ON "public"."applicant_processes"("processId", "status");

-- CreateIndex
CREATE INDEX "applicant_processes_status_idx" ON "public"."applicant_processes"("status");

-- CreateIndex
CREATE INDEX "processes_status_idx" ON "public"."processes"("status");

-- CreateIndex
CREATE INDEX "processes_groupId_status_idx" ON "public"."processes"("groupId", "status");
