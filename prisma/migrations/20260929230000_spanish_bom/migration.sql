-- Spaanse uitgave van het Boek van Mormon, rechtstreeks opgehaald van de
-- officiële kerkwebsite. De collectie is zichtbaar omdat de Spaanse UI en
-- de bijbehorende inhoud samen worden uitgerold.
INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled", "visibleToUsers", "work", "language")
VALUES ('content_bom_es', 'book-of-mormon-es', 'Libro de Mormón', '📖', 2, true, true, 'bofm', 'es')
ON CONFLICT ("id") DO NOTHING;

-- De Spaanse woordzoeker gebruikt de officiële Spaanse woordenlijst. Andere
-- spellen blijven uitgeschakeld totdat hun Spaanse woorden/content beschikbaar
-- is en gecontroleerd is.
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
VALUES ('game_scope_word_search_bom_es', 'word-search', 'content_bom_es')
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
