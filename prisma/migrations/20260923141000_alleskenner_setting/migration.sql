-- Beheerschakelaar voor De Alleskenner: standaard uit, zodat een beheerder het
-- eerst kan testen. Plus de koppeling aan de bestaande contentcollectie, zodat
-- de spelkaart bij Spelen zichtbaar kan worden.
ALTER TABLE "GameSettings" ADD COLUMN "alleskennerEnabled" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
VALUES ('game_scope_alleskenner_bom', 'alleskenner', 'content_bom')
ON CONFLICT DO NOTHING;
