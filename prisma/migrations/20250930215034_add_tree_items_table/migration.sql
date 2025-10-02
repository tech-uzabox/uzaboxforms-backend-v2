-- CreateTable
CREATE TABLE "public"."add_to_database_tree_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."AddToDatabaseStatus" NOT NULL DEFAULT 'ENABLED',
    "parentId" UUID,
    "addToDatabaseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_to_database_tree_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."add_to_database_tree_items" ADD CONSTRAINT "add_to_database_tree_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."add_to_database_tree_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."add_to_database_tree_items" ADD CONSTRAINT "add_to_database_tree_items_addToDatabaseId_fkey" FOREIGN KEY ("addToDatabaseId") REFERENCES "public"."add_to_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
