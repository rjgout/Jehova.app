-- Invalidate all previously issued session JWTs when a password is reset or changed.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
