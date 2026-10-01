-- Het aparte logo voor het welkomscherm is vervallen: daar staat nu de
-- mascottefamilie (family/welcome). Het veld werd sindsdien nergens meer
-- getoond, dus weghalen verandert niets aan wat gebruikers zien.
ALTER TABLE "BrandingSettings" DROP COLUMN IF EXISTS "heroLogoDataUrl";
