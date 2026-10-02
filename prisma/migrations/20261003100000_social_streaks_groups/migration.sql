-- Samen: vriendenreeksen, groepen, groepsreeksen, geschonken
-- reeksbevriezingen en seintjes (zie docs/SAMEN.md). Alleen nieuwe tabellen
-- en een nieuwe kolom met standaardwaarde: bestaande reeksen, freezes en
-- vriendschappen veranderen niet.

-- CreateEnum
CREATE TYPE "FriendStreakStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED', 'BROKEN', 'ENDED');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroupDayStatus" AS ENUM ('OPEN', 'ACHIEVED', 'PROTECTED', 'PAUSED', 'MISSED');

-- CreateEnum
CREATE TYPE "GroupFreezeOfferStatus" AS ENUM ('RESERVED', 'RELEASED', 'CONSUMED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FreezeTxType" ADD VALUE 'GROUP_RESERVED';
ALTER TYPE "FreezeTxType" ADD VALUE 'GROUP_RELEASED';
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nudgesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FriendStreak" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "status" "FriendStreakStatus" NOT NULL DEFAULT 'PENDING',
    "openKey" TEXT,
    "startDay" TEXT,
    "nextDay" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastAchievedDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "FriendStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "membersCanInvite" BOOLEAN NOT NULL DEFAULT true,
    "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakStartDay" TEXT,
    "lastAchievedDay" TEXT,
    "nextDay" TEXT NOT NULL,
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "adminSince" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibleFromDay" TEXT NOT NULL,
    "leftAt" TIMESTAMP(3),
    "rejoinAfter" TIMESTAMP(3),

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDay" (
    "groupId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" "GroupDayStatus" NOT NULL DEFAULT 'OPEN',
    "eligibleCount" INTEGER,
    "requiredCount" INTEGER,
    "contributorCount" INTEGER,
    "perfect" BOOLEAN NOT NULL DEFAULT false,
    "streakAfter" INTEGER,
    "achievedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "GroupDay_pkey" PRIMARY KEY ("groupId","dayKey")
);

-- CreateTable
CREATE TABLE "GroupFreezeOffer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GroupFreezeOfferStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GroupFreezeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAchievement" (
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAchievement_pkey" PRIMARY KEY ("groupId","slug")
);

-- CreateTable
CREATE TABLE "SocialEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "groupId" TEXT,
    "friendStreakId" TEXT,
    "userId" TEXT,
    "dayKey" TEXT,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nudge" (
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("senderId","recipientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendStreak_openKey_key" ON "FriendStreak"("openKey");

-- CreateIndex
CREATE INDEX "FriendStreak_userAId_status_idx" ON "FriendStreak"("userAId", "status");

-- CreateIndex
CREATE INDEX "FriendStreak_userBId_status_idx" ON "FriendStreak"("userBId", "status");

-- CreateIndex
CREATE INDEX "SocialGroup_showOnLeaderboard_currentStreak_idx" ON "SocialGroup"("showOnLeaderboard", "currentStreak");

-- CreateIndex
CREATE INDEX "SocialGroup_showOnLeaderboard_memberCount_idx" ON "SocialGroup"("showOnLeaderboard", "memberCount");

-- CreateIndex
CREATE INDEX "SocialGroup_nextCheckAt_idx" ON "SocialGroup"("nextCheckAt");

-- CreateIndex
CREATE INDEX "GroupMembership_userId_leftAt_idx" ON "GroupMembership"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "GroupMembership_groupId_leftAt_idx" ON "GroupMembership"("groupId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupInvite_inviteeId_status_idx" ON "GroupInvite"("inviteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_groupId_inviteeId_key" ON "GroupInvite"("groupId", "inviteeId");

-- CreateIndex
CREATE INDEX "GroupDay_groupId_status_dayKey_idx" ON "GroupDay"("groupId", "status", "dayKey");

-- CreateIndex
CREATE INDEX "GroupFreezeOffer_userId_groupId_status_idx" ON "GroupFreezeOffer"("userId", "groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupFreezeOffer_groupId_dayKey_key" ON "GroupFreezeOffer"("groupId", "dayKey");

-- CreateIndex
CREATE INDEX "SocialEvent_groupId_createdAt_idx" ON "SocialEvent"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialEvent_friendStreakId_createdAt_idx" ON "SocialEvent"("friendStreakId", "createdAt");

-- AddForeignKey
ALTER TABLE "FriendStreak" ADD CONSTRAINT "FriendStreak_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendStreak" ADD CONSTRAINT "FriendStreak_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendStreak" ADD CONSTRAINT "FriendStreak_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDay" ADD CONSTRAINT "GroupDay_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupFreezeOffer" ADD CONSTRAINT "GroupFreezeOffer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupFreezeOffer" ADD CONSTRAINT "GroupFreezeOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAchievement" ADD CONSTRAINT "GroupAchievement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEvent" ADD CONSTRAINT "SocialEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEvent" ADD CONSTRAINT "SocialEvent_friendStreakId_fkey" FOREIGN KEY ("friendStreakId") REFERENCES "FriendStreak"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Prestaties voor vriendenreeksen (net als de bestaande: geen XP). Pas
-- verdiend door een nieuwe vriendenreeks, dus geen backfill nodig.
INSERT INTO "Achievement" ("id", "slug", "name", "description", "icon")
VALUES
  ('achievement-friend-streak-1', 'friend-streak-1', 'Samen begonnen', 'Haalde de eerste dag van een vriendenreeks.', '🤝'),
  ('achievement-friend-streak-7', 'friend-streak-7', 'Een week samen', 'Hield een vriendenreeks 7 dagen vol.', '🔥'),
  ('achievement-friend-streak-30', 'friend-streak-30', 'Een maand samen', 'Hield een vriendenreeks 30 dagen vol.', '📅'),
  ('achievement-friend-streak-100', 'friend-streak-100', 'Honderd dagen', 'Hield een vriendenreeks 100 dagen vol.', '💯'),
  ('achievement-friend-streak-365', 'friend-streak-365', 'Een jaar samen', 'Hield een vriendenreeks 365 dagen vol.', '🏆')
ON CONFLICT ("slug") DO NOTHING;
