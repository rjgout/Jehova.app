-- Bestaande gebruikers starten bewust met een lege badge; alleen nieuwe meldingen tellen mee.
ALTER TABLE "User" ADD COLUMN "notificationBadgeCount" INTEGER NOT NULL DEFAULT 0;