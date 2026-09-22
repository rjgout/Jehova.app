CREATE TABLE "ContentCollection" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ContentCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentCollection_slug_key" ON "ContentCollection"("slug");

CREATE TABLE "GameContentScope" (
  "id" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "contentCollectionId" TEXT NOT NULL,
  CONSTRAINT "GameContentScope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameContentScope_gameKey_contentCollectionId_key" ON "GameContentScope"("gameKey", "contentCollectionId");
CREATE INDEX "GameContentScope_contentCollectionId_idx" ON "GameContentScope"("contentCollectionId");

CREATE TABLE "ContentSwitcherSettings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ContentSwitcherSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "activeContentCollectionId" TEXT;
ALTER TABLE "Book" ADD COLUMN "contentCollectionId" TEXT;
ALTER TABLE "Course" ADD COLUMN "contentCollectionId" TEXT;

INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled")
VALUES ('content_bom', 'boek-van-mormon', 'Boek van Mormon', '📖', 0, true);

UPDATE "Book" SET "contentCollectionId" = 'content_bom' WHERE "contentCollectionId" IS NULL;
UPDATE "Course" SET "contentCollectionId" = 'content_bom' WHERE "contentCollectionId" IS NULL;

ALTER TABLE "Book" ALTER COLUMN "contentCollectionId" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "contentCollectionId" SET NOT NULL;

ALTER TABLE "Book" ADD CONSTRAINT "Book_contentCollectionId_fkey" FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_contentCollectionId_fkey" FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_activeContentCollectionId_fkey" FOREIGN KEY ("activeContentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameContentScope" ADD CONSTRAINT "GameContentScope_contentCollectionId_fkey" FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId") VALUES
  ('game_scope_word_game_bom', 'word-game', 'content_bom'),
  ('game_scope_scrabble_bom', 'scrabble', 'content_bom'),
  ('game_scope_gezinsavond_bom', 'gezinsavond', 'content_bom'),
  ('game_scope_chapter_guess_bom', 'chapter-guess', 'content_bom'),
  ('game_scope_challenges_bom', 'challenges', 'content_bom');

INSERT INTO "ContentSwitcherSettings" ("id", "enabled") VALUES ('singleton', false);