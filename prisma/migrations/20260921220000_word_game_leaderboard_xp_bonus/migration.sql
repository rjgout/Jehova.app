-- Bewaar welke ranglijstbonus al aan een woordspel is uitgekeerd.
ALTER TABLE "WordGame" ADD COLUMN "leaderboardXpBonus" INTEGER NOT NULL DEFAULT 0;
