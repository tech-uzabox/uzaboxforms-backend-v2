-- CreateTable
CREATE TABLE "public"."widget_sandboxes" (
    "id" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "description" TEXT,
    "title" TEXT NOT NULL,
    "visualizationType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_sandboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "widget_sandboxes_chatId_idx" ON "public"."widget_sandboxes"("chatId");

-- AddForeignKey
ALTER TABLE "public"."widget_sandboxes" ADD CONSTRAINT "widget_sandboxes_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
