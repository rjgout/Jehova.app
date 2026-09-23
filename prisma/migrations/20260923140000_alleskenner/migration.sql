-- De Alleskenner (zie docs/ALLESKENNER.md): nieuwe live-spelmodus, contentpool
-- en per gebruiker wat al gezien is. Raakt geen bestaande gegevens.
ALTER TYPE "LiveGameMode" ADD VALUE 'ALLESKENNER';

CREATE TYPE "AlleskennerItemKind" AS ENUM ('QUESTION', 'TOPIC', 'PUZZLE', 'GALLERY', 'MEMORY');

CREATE TABLE "AlleskennerItem" (
  "id" TEXT NOT NULL,
  "kind" "AlleskennerItemKind" NOT NULL,
  "data" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlleskennerItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlleskennerItem_kind_enabled_idx" ON "AlleskennerItem"("kind", "enabled");

CREATE TABLE "AlleskennerSeen" (
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlleskennerSeen_pkey" PRIMARY KEY ("userId", "itemId")
);
CREATE INDEX "AlleskennerSeen_itemId_idx" ON "AlleskennerSeen"("itemId");

ALTER TABLE "AlleskennerSeen" ADD CONSTRAINT "AlleskennerSeen_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlleskennerSeen" ADD CONSTRAINT "AlleskennerSeen_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "AlleskennerItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
