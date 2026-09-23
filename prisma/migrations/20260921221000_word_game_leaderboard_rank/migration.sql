-- Bewaar de exacte top-10-positie zodat de eenmalige bonus ook na herladen zichtbaar blijft.
ALTER TABLE "WordGame" ADD COLUMN "leaderboardRank" INTEGER;
