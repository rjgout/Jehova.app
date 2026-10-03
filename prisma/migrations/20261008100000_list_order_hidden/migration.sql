-- Een kaart verbergen uit het eigen overzicht (Spelen). Standaard zichtbaar:
-- bestaande rijen houden precies wat ze nu doen.
ALTER TABLE "UserListOrder" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
