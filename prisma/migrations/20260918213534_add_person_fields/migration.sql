-- AddColumn gender, motherId naar Person tabel.
-- Deze migratie heette eerder "1789767235_add_person_fields". Die korte
-- tijdstempel sorteerde vóór "..._init", waardoor een verse installatie
-- hier vastliep (Person bestond nog niet). Bestaande installaties hebben
-- de kolommen al; daarom is alles hieronder idempotent.
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "motherId" TEXT;

-- AddForeignKey voor motherId
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Person_motherId_fkey') THEN
    ALTER TABLE "Person" ADD CONSTRAINT "Person_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
