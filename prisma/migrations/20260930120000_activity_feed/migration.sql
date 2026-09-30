-- Sociale feed voor gebundelde XP-activiteiten, prestaties en reacties.
CREATE TABLE "ActivityFeedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "xpAmount" INTEGER NOT NULL DEFAULT 0,
    "xpReason" "XPReason",
    "achievementSlug" TEXT,
    "achievementName" TEXT,
    "achievementIcon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeedItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityFeedReaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeedReaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityFeedItem_userId_updatedAt_idx" ON "ActivityFeedItem"("userId", "updatedAt");
CREATE INDEX "ActivityFeedItem_userId_kind_groupKey_createdAt_idx" ON "ActivityFeedItem"("userId", "kind", "groupKey", "createdAt");
CREATE UNIQUE INDEX "ActivityFeedReaction_itemId_userId_key" ON "ActivityFeedReaction"("itemId", "userId");
CREATE INDEX "ActivityFeedReaction_userId_idx" ON "ActivityFeedReaction"("userId");

ALTER TABLE "ActivityFeedItem" ADD CONSTRAINT "ActivityFeedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityFeedReaction" ADD CONSTRAINT "ActivityFeedReaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ActivityFeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityFeedReaction" ADD CONSTRAINT "ActivityFeedReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
