-- Twee nieuwe contentcollecties: Leer en Verbonden en de Parel van Grote
-- Waarde (tekst van de kerkwebsite, zie scripts/church-text/). Geen
-- schemawijziging, alleen rijen. Bewust verborgen voor gewone gebruikers
-- (visibleToUsers = false): een beheerder ziet ze al en zet ze aan in
-- /adminbackend zodra de inhoud af is. Geen GameContentScope-rijen: de
-- spellen blijven bij het Boek van Mormon.

INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled", "visibleToUsers")
VALUES
  ('content_dc', 'leer-en-verbonden', 'Leer en Verbonden', '📜', 30, true, false),
  ('content_pgp', 'parel-van-grote-waarde', 'Parel van Grote Waarde', '💎', 40, true, false)
ON CONFLICT ("id") DO NOTHING;
