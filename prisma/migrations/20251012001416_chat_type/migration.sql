-- CreateEnum
CREATE TYPE "public"."ChatAIType" AS ENUM ('DASHBOARD', 'FORM');

-- AlterTable
ALTER TABLE "public"."chats" ADD COLUMN     "type" "public"."ChatAIType" NOT NULL DEFAULT 'FORM';
