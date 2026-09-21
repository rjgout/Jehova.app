-- Versnel het ophalen van de winnaars van het woord van de dag.
CREATE INDEX "WordGame_dayKey_status_finishedAt_idx"
ON "WordGame"("dayKey", "status", "finishedAt");
