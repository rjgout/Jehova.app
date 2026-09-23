-- De Alleskenner: seizoenen (zie docs/ALLESKENNER.md). Alleen nieuwe tabellen;
-- bestaande gegevens veranderen niet, dus geen backfill nodig.

-- CreateEnum
CREATE TYPE "AlleskennerSeasonStatus" AS ENUM ('REGULAR', 'FINALE', 'FINISHED');

-- CreateEnum
CREATE TYPE "AlleskennerMemberStatus" AS ENUM ('WAITING', 'ACTIVE', 'ELIMINATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AlleskennerEveningStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "AlleskennerSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "deputyHostId" TEXT,
    "status" "AlleskennerSeasonStatus" NOT NULL DEFAULT 'REGULAR',
    "championId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AlleskennerSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlleskennerSeasonMember" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AlleskennerMemberStatus" NOT NULL DEFAULT 'WAITING',
    "queuePosition" INTEGER NOT NULL,
    "evenings" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "secondsTotal" INTEGER NOT NULL DEFAULT 0,
    "finaleSeed" INTEGER,
    "finaleEntered" BOOLEAN NOT NULL DEFAULT false,
    "finaleOut" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlleskennerSeasonMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlleskennerEvening" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "isFinale" BOOLEAN NOT NULL DEFAULT false,
    "isLast" BOOLEAN NOT NULL DEFAULT false,
    "gameId" TEXT,
    "lineup" TEXT NOT NULL,
    "newcomers" TEXT NOT NULL,
    "results" TEXT,
    "status" "AlleskennerEveningStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AlleskennerEvening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlleskennerSeason_hostId_idx" ON "AlleskennerSeason"("hostId");

-- CreateIndex
CREATE INDEX "AlleskennerSeasonMember_userId_idx" ON "AlleskennerSeasonMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlleskennerSeasonMember_seasonId_userId_key" ON "AlleskennerSeasonMember"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlleskennerEvening_gameId_key" ON "AlleskennerEvening"("gameId");

-- CreateIndex
CREATE INDEX "AlleskennerEvening_seasonId_idx" ON "AlleskennerEvening"("seasonId");

-- AddForeignKey
ALTER TABLE "AlleskennerSeason" ADD CONSTRAINT "AlleskennerSeason_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerSeason" ADD CONSTRAINT "AlleskennerSeason_deputyHostId_fkey" FOREIGN KEY ("deputyHostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerSeason" ADD CONSTRAINT "AlleskennerSeason_championId_fkey" FOREIGN KEY ("championId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerSeasonMember" ADD CONSTRAINT "AlleskennerSeasonMember_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "AlleskennerSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerSeasonMember" ADD CONSTRAINT "AlleskennerSeasonMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerEvening" ADD CONSTRAINT "AlleskennerEvening_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "AlleskennerSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlleskennerEvening" ADD CONSTRAINT "AlleskennerEvening_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LiveGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;
