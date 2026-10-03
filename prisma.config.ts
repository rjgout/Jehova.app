import { defineConfig } from "prisma/config";

// Prisma laadt .env niet meer zelf. Lokaal staat DATABASE_URL vaak in .env;
// in Docker komt hij uit de omgeving en bestaat .env niet, vandaar de try.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Bewust geen env() van Prisma: die gooit al bij `prisma generate` (in de
    // Docker-build) als DATABASE_URL ontbreekt, terwijl generate hem niet nodig heeft.
    url: process.env.DATABASE_URL ?? "",
  },
});
