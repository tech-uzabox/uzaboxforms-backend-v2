-- AlterTable
ALTER TABLE "public"."forms" ADD COLUMN     "folderId" UUID;

-- CreateTable
CREATE TABLE "public"."folders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_creatorId_idx" ON "public"."folders"("creatorId");

-- CreateIndex
CREATE INDEX "forms_folderId_idx" ON "public"."forms"("folderId");

-- AddForeignKey
ALTER TABLE "public"."folders" ADD CONSTRAINT "folders_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."forms" ADD CONSTRAINT "forms_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
