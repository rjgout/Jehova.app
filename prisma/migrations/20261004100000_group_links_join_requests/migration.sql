-- Samen: groepslinks/QR met toegangsverzoeken, en indexen zodat de
-- minuuttaak (scheduler.ts) alleen nieuwe en aflopende dagen bekijkt.
--
-- Geen backfill nodig: geen enkele bestaande groep heeft een groepslink, dus
-- membersCanApprove (standaard aan) verandert voor niemand iets tot een
-- beheerder zelf een link aanzet. Bestaande vriendenreeksen krijgen
-- nextCheckAt = nu en worden bij de eerste ronde gewoon bekeken.

-- CreateEnum
CREATE TYPE "GroupJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "FriendStreak" ADD COLUMN     "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SocialGroup" ADD COLUMN     "joinLinkCreatedAt" TIMESTAMP(3),
ADD COLUMN     "joinLinkToken" TEXT,
ADD COLUMN     "membersCanApprove" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GroupJoinRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GroupJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "openKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "GroupJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupJoinRequest_openKey_key" ON "GroupJoinRequest"("openKey");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_groupId_status_idx" ON "GroupJoinRequest"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupJoinRequest_userId_createdAt_idx" ON "GroupJoinRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FriendStreak_status_nextCheckAt_idx" ON "FriendStreak"("status", "nextCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialGroup_joinLinkToken_key" ON "SocialGroup"("joinLinkToken");

-- CreateIndex
CREATE INDEX "StreakDay_createdAt_idx" ON "StreakDay"("createdAt");

-- AddForeignKey
ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
