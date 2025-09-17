-- AddForeignKey
ALTER TABLE "public"."qr_code_documents" ADD CONSTRAINT "qr_code_documents_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
