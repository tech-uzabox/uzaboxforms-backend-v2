-- CreateTable: Create process_folders table
CREATE TABLE "public"."process_folders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_folders_creatorId_idx" ON "public"."process_folders"("creatorId");

-- AddForeignKey
ALTER TABLE "public"."process_folders" ADD CONSTRAINT "process_folders_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add processFolderId column to processes
ALTER TABLE "public"."processes" ADD COLUMN "processFolderId" UUID;

-- Create a default process folder for existing processes
DO $$
DECLARE
    admin_user_id UUID;
    default_process_folder_id UUID;
BEGIN
    -- Get the first user (preferably admin) to be the folder creator
    SELECT id INTO admin_user_id FROM "public"."users" 
    ORDER BY "createdAt" ASC LIMIT 1;
    
    -- If we have a user, create the default process folder
    IF admin_user_id IS NOT NULL THEN
        -- Check if default process folder already exists
        SELECT id INTO default_process_folder_id FROM "public"."process_folders" 
        WHERE name = 'Default Folder';
        
        -- Create default process folder if it doesn't exist
        IF default_process_folder_id IS NULL THEN
            INSERT INTO "public"."process_folders" (id, name, description, "creatorId", "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid(),
                'Default Folder',
                'Default folder for processes',
                admin_user_id,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING id INTO default_process_folder_id;
        END IF;
        
        -- Update all existing processes to use the default process folder
        UPDATE "public"."processes" 
        SET "processFolderId" = default_process_folder_id 
        WHERE "processFolderId" IS NULL;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX "processes_processFolderId_idx" ON "public"."processes"("processFolderId");

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_processFolderId_fkey" FOREIGN KEY ("processFolderId") REFERENCES "public"."process_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

