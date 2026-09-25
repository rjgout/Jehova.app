-- Spellen die met de Engelse uitgave van het Boek van Mormon werken: De
-- Alleskenner (speelt per speler in de eigen taal), Uitdagingen en de
-- live-quiz (die gebruiken de hoofdstukken en oefeningen van de gekozen
-- uitgave). Raad het hoofdstuk, Gezinsavond en de woordspellen blijven
-- voorlopig bij de Nederlandse uitgave. Alleen nieuwe rijen: voor de
-- Nederlandse uitgave verandert niets. Daarna regelt de beheerder dit in
-- /adminbackend (Spelletjes).
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
SELECT v.id, v."gameKey", 'content_bom_en'
FROM (VALUES
  ('game_scope_alleskenner_bom_en', 'alleskenner'),
  ('game_scope_challenges_bom_en', 'challenges'),
  ('game_scope_live_exercises_bom_en', 'live-exercises')
) AS v(id, "gameKey")
WHERE EXISTS (SELECT 1 FROM "ContentCollection" WHERE "id" = 'content_bom_en')
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
