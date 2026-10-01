-- De rangbonus van het woord van de dag wordt voortaan pas uitgedeeld als de
-- woorddag overal ter wereld voorbij is (scheduler, settleWordGameBonuses).
ALTER TABLE "DailyWord" ADD COLUMN "bonusSettledAt" TIMESTAMP(3);

-- Backfill: voor alle bestaande woorddagen is de bonus al direct bij het
-- raden uitgedeeld (de oude regel). Markeer ze als afgehandeld, zodat
-- niemand voor een oude woorddag nog eens bonus-XP krijgt.
UPDATE "DailyWord" SET "bonusSettledAt" = CURRENT_TIMESTAMP WHERE "bonusSettledAt" IS NULL;
