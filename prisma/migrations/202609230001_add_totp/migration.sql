ALTER TABLE "User"
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpSecretEncrypted" TEXT,
ADD COLUMN "totpRecoveryCodes" TEXT;
