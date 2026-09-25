-- Engels is kiesbaar (app-taal en content): de Engelse uitgaven worden
-- zichtbaar in de contentkiezer. Het Boek van Mormon altijd; de Leer en
-- Verbonden en de Parel van Grote Waarde net als hun Nederlandse uitgave
-- (die staan standaard verborgen, of zoals de beheerder ze instelde).
-- Alleen een extra keuze: niemands actieve content of taal verandert.
UPDATE "ContentCollection" SET "visibleToUsers" = true WHERE "id" = 'content_bom_en';
UPDATE "ContentCollection" en SET "visibleToUsers" = nl."visibleToUsers"
FROM "ContentCollection" nl
WHERE (en."id", nl."id") IN (('content_dc_en', 'content_dc'), ('content_pgp_en', 'content_pgp'));
