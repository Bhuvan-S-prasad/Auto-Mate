/*
  Warnings:

  - You are about to drop the `TelegramLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "EpisodeType" AS ENUM ('email_received', 'email_sent', 'email_drafted', 'event_attended', 'event_created', 'task_created', 'task_completed', 'conversation', 'agent_action');

-- CreateEnum
CREATE TYPE "FactCategory" AS ENUM ('location', 'person', 'preference', 'routine', 'relationship', 'other');

-- CreateEnum
CREATE TYPE "FactSource" AS ENUM ('user', 'inferred');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('auto_daily_summary', 'user_entry', 'weekly_review');

-- DropTable
DROP TABLE "TelegramLink";

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "EpisodeType" NOT NULL,
    "summary" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importance" INTEGER NOT NULL DEFAULT 3,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_facts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" "FactCategory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" "FactSource" NOT NULL DEFAULT 'inferred',
    "embedding" vector(1536),
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "JournalEntryType" NOT NULL,
    "content" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mood" TEXT,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_code_key" ON "telegram_links"("code");

-- CreateIndex
CREATE INDEX "episodes_user_id_occurred_at_idx" ON "episodes"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "episodes_user_id_type_idx" ON "episodes"("user_id", "type");

-- CreateIndex
CREATE INDEX "episodes_user_id_importance_idx" ON "episodes"("user_id", "importance");

-- CreateIndex
CREATE INDEX "user_facts_user_id_category_idx" ON "user_facts"("user_id", "category");

-- CreateIndex
CREATE INDEX "user_facts_user_id_confidence_idx" ON "user_facts"("user_id", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "user_facts_user_id_key_key" ON "user_facts"("user_id", "key");

-- CreateIndex
CREATE INDEX "journal_entries_user_id_date_idx" ON "journal_entries"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_user_id_date_type_key" ON "journal_entries"("user_id", "date", "type");

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
