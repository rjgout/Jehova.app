-- Engelse uitgaven van het Boek van Mormon, Leer en Verbonden en de Parel
-- van Grote Waarde (tekst van de kerkwebsite, zie
-- scripts/church-text/fetch_scripture.py). Geen schemawijziging, alleen
-- rijen. Verborgen voor gewone gebruikers (visibleToUsers = false) tot de
-- taalkeuze en de vertaalde app-teksten er zijn; een beheerder ziet ze al.
-- De naam staat in de taal van de uitgave zelf. Geen GameContentScope-rijen:
-- de spellen blijven voorlopig bij de Nederlandse uitgave.

INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled", "visibleToUsers", "work", "language")
VALUES
  ('content_bom_en', 'book-of-mormon', 'Book of Mormon', '📖', 1, true, false, 'bofm', 'en'),
  ('content_dc_en', 'doctrine-and-covenants', 'Doctrine and Covenants', '📜', 31, true, false, 'dc-testament', 'en'),
  ('content_pgp_en', 'pearl-of-great-price', 'Pearl of Great Price', '💎', 41, true, false, 'pgp', 'en')
ON CONFLICT ("id") DO NOTHING;
