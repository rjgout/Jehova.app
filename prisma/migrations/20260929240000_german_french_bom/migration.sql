-- Duitse en Franse uitgaven van het Boek van Mormon, rechtstreeks opgehaald
-- van de officiële kerkwebsite. Ze krijgen elk een eigen collectie zodat de
-- taal van de tekst en van de woordzoeker onafhankelijk gekozen kan worden.
INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled", "visibleToUsers", "work", "language")
VALUES
  ('content_bom_de', 'book-of-mormon-de', 'Das Buch Mormon', '📖', 3, true, true, 'bofm', 'de'),
  ('content_bom_fr', 'book-of-mormon-fr', 'Le Livre de Mormon', '📖', 4, true, true, 'bofm', 'fr')
ON CONFLICT ("id") DO NOTHING;

-- Alleen de woordzoeker is voor deze nieuwe uitgaven inhoudelijk beschikbaar;
-- andere spellen worden pas zichtbaar na een afzonderlijke taalcontrole.
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
VALUES
  ('game_scope_word_search_bom_de', 'word-search', 'content_bom_de'),
  ('game_scope_word_search_bom_fr', 'word-search', 'content_bom_fr')
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
