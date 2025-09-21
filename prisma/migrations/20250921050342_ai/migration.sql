-- CreateTable
CREATE TABLE "public"."chats" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "attachments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."votes" (
    "chatId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "isUpvoted" BOOLEAN NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("chatId","messageId")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "userId" UUID NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suggestions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "documentCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "description" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_saves" (
    "id" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "rolesData" JSONB,
    "processData" JSONB,
    "stepsData" JSONB,
    "formsData" JSONB,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_saves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_chatId_idx" ON "public"."messages"("chatId");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "public"."documents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_id_createdAt_key" ON "public"."documents"("id", "createdAt");

-- CreateIndex
CREATE INDEX "suggestions_documentId_documentCreatedAt_idx" ON "public"."suggestions"("documentId", "documentCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "process_saves_chatId_key" ON "public"."process_saves"("chatId");

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."suggestions" ADD CONSTRAINT "suggestions_documentId_documentCreatedAt_fkey" FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "public"."documents"("id", "createdAt") ON DELETE CASCADE ON UPDATE CASCADE;
