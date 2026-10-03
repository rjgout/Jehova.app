import type { LeagueTier } from "@/generated/prisma/enums";

// Los van leagues.ts zodat client components de divisies kunnen tonen
// zonder de Prisma-client (alleen voor de server) mee te bundelen.
export const TIER_ORDER: LeagueTier[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "LEGEND",
];

export const TIER_LABELS: Record<LeagueTier, string> = {
  BRONZE: "Zaad",
  SILVER: "Licht",
  GOLD: "Strijder",
  PLATINUM: "Rots",
  DIAMOND: "Erfgenaam",
  MASTER: "Overvloed",
  GRANDMASTER: "Zion",
  LEGEND: "Eeuwigheid",
};

/**
 * De officiële divisie-emblemen (public/icons/divisions/, 384x384 WebP),
 * één per divisie. De enige plek die deze paden kent; tonen gaat via
 * <DivisionEmblem tier /> (src/components/versado/DivisionEmblem.tsx).
 */
export const TIER_EMBLEMS: Record<LeagueTier, string> = {
  BRONZE: "/icons/divisions/bronze.webp",
  SILVER: "/icons/divisions/silver.webp",
  GOLD: "/icons/divisions/gold.webp",
  PLATINUM: "/icons/divisions/platinum.webp",
  DIAMOND: "/icons/divisions/diamond.webp",
  MASTER: "/icons/divisions/master.webp",
  GRANDMASTER: "/icons/divisions/grandmaster.webp",
  LEGEND: "/icons/divisions/legend.webp",
};
