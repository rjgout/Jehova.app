-- Per collectie kiezen of gewone gebruikers haar in het contentmenu zien.
-- Standaard true: bestaande collecties blijven zichtbaar zoals voorheen.
ALTER TABLE "ContentCollection" ADD COLUMN "visibleToUsers" BOOLEAN NOT NULL DEFAULT true;
