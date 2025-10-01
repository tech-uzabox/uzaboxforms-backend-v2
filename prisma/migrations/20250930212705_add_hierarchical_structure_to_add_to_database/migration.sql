/*
  Warnings:

  - You are about to drop the column `levels` on the `add_to_databases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."add_to_databases" DROP COLUMN "levels",
ADD COLUMN     "parentId" UUID;

-- AddForeignKey
ALTER TABLE "public"."add_to_databases" ADD CONSTRAINT "add_to_databases_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."add_to_databases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
