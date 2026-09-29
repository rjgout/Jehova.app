ALTER TYPE "XPReason" ADD VALUE 'WORD_SEARCH_COMPLETED';

ALTER TABLE "GameSettings" ADD COLUMN "wordSearchEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "WordSearchDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "WordSearchGameStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TABLE "WordSearchGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentCollectionId" TEXT NOT NULL,
    "difficulty" "WordSearchDifficulty" NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'RANDOM',
    "size" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "grid" TEXT NOT NULL,
    "words" TEXT NOT NULL,
    "foundWords" TEXT NOT NULL DEFAULT '[]',
    "status" "WordSearchGameStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WordSearchGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WordSearchGame_userId_status_idx" ON "WordSearchGame"("userId", "status");
CREATE INDEX "WordSearchGame_contentCollectionId_idx" ON "WordSearchGame"("contentCollectionId");

ALTER TABLE "WordSearchGame" ADD CONSTRAINT "WordSearchGame_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordSearchGame" ADD CONSTRAINT "WordSearchGame_contentCollectionId_fkey"
  FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Woordzoeker gebruikt uitsluitend uitgaven van hetzelfde werk, ook als de
-- actieve contenttaal later naar bijvoorbeeld Engels wordt gewisseld.
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
SELECT 'word_search_' || "id", 'word-search', "id"
FROM "ContentCollection" WHERE "work" = 'bofm'
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
