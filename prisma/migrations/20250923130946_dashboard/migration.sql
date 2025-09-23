-- AddForeignKey
ALTER TABLE "public"."dashboards" ADD CONSTRAINT "dashboards_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
