-- Vertalingen van Alleskenner-onderdelen per contenttaal. Nieuwe tabel; de
-- Nederlandse onderdelen en bestaande spellen veranderen niet, dus er is
-- niets om met terugwerkende kracht te vullen.
CREATE TABLE "AlleskennerItemTranslation" (
    "itemId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlleskennerItemTranslation_pkey" PRIMARY KEY ("itemId","language")
);

CREATE INDEX "AlleskennerItemTranslation_language_idx" ON "AlleskennerItemTranslation"("language");

ALTER TABLE "AlleskennerItemTranslation" ADD CONSTRAINT "AlleskennerItemTranslation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AlleskennerItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
