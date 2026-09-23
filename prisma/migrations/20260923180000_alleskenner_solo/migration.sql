-- AlterEnum
ALTER TYPE "XPReason" ADD VALUE 'ALLESKENNER_SOLO';

-- CreateEnum
CREATE TYPE "AlleskennerSoloMode" AS ENUM ('DAILY', 'PRACTICE');

-- CreateEnum
CREATE TYPE "AlleskennerSoloStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateTable
CREATE TABLE "AlleskennerSoloRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "AlleskennerSoloMode" NOT NULL,
    "dayKey" TEXT,
    "items" TEXT NOT NULL,
    "status" "AlleskennerSoloStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AlleskennerSoloRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlleskennerDailySet" (
    "dayKey" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlleskennerDailySet_pkey" PRIMARY KEY ("dayKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlleskennerSoloRun_userId_dayKey_key" ON "AlleskennerSoloRun"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "AlleskennerSoloRun_mode_dayKey_status_idx" ON "AlleskennerSoloRun"("mode", "dayKey", "status");

-- AddForeignKey
ALTER TABLE "AlleskennerSoloRun" ADD CONSTRAINT "AlleskennerSoloRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Competitieregel voor de nieuwe activiteit, alleen als een beheerder er nog
-- geen eigen waarde voor heeft ingesteld. Bestaande regels blijven ongemoeid.
UPDATE "LeagueSettings"
SET "activityRules" = (('{"ALLESKENNER_SOLO":{"dailyCap":80,"decayFactor":0.7}}'::jsonb) || "activityRules"::jsonb)::text
WHERE "id" = 'singleton' AND NOT ("activityRules"::jsonb ? 'ALLESKENNER_SOLO');
