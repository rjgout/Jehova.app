-- AddColumn: eigen avatar-emoji, los van de gebruikersnaam.
-- Nullable zonder backfill: bestaande gebruikers krijgen gewoon null
-- (= letter-avatar zoals voorheen), niemand ziet ongevraagd een emoji.
-- Heette eerder "1789831396_add_user_avatar_emoji" (verkeerde sortering vóór
-- "..._init" op een verse database); idempotent omdat bestaande
-- installaties de kolom al hebben.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarEmoji" TEXT;
