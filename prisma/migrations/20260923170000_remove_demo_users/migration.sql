-- Demo-accounts verdwijnen uit de app (geen SEED_DEMO_USERS meer). Bestaan ze
-- nog op een instantie, dan eerst verwijderen: ze hebben een publiek bekend
-- wachtwoord. Alleen de drie accounts die de oude seed aanmaakte én als demo
-- gemarkeerd zijn; alle koppelingen naar User cascaderen, net als bij het
-- verwijderen van een account via /api/account.
DELETE FROM "User"
WHERE "isDemoSeed" = true
  AND "email" IN ('anna@example.com', 'bram@example.com', 'carla@example.com');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isDemoSeed";
