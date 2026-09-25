-- Personen horen voortaan bij een contentcollectie, zodat de Leer en
-- Verbonden eigen personages kan krijgen. Alle bestaande personen komen uit
-- het Boek van Mormon: de standaardwaarde vult ze direct met content_bom,
-- dus voor bestaande gebruikers verandert er niets.

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "contentCollectionId" TEXT NOT NULL DEFAULT 'content_bom';

-- CreateIndex
CREATE INDEX "Person_contentCollectionId_idx" ON "Person"("contentCollectionId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_contentCollectionId_fkey" FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
