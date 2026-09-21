import { Prisma, type LeagueTier } from "@prisma/client";
import { weekStartKey } from "@/lib/dates";

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

export const TIER_ICONS: Record<LeagueTier, string> = {
  BRONZE: "🌱",
  SILVER: "🔥",
  GOLD: "🛡️",
  PLATINUM: "🪨",
  DIAMOND: "👑",
  MASTER: "⭐",
  GRANDMASTER: "🏛️",
  LEGEND: "✨",
};

type Tx = Prisma.TransactionClient;

export interface ActivityRule {
  dailyCap: number;
  decayFactor: number;
  winBonus?: number;
  levelMultiplier?: Record<string, number>;
}

export interface LeagueSettingsView {
  groupSize: number;
  promoteCount: number;
  demoteCount: number;
  minGroupSizeForMovement: number;
  seasonWeekCount: number;
  localeCode: string;
  activityRules: Record<string, ActivityRule>;
}

// Terugvalwaarden als de singleton-rij ooit ontbreekt of niet parsebaar is —
// zelfde vorm/waarden als de seed in de migratie, puur een noodvangnet zodat
// dit nooit hard crasht.
export const DEFAULT_ACTIVITY_RULES: Record<string, ActivityRule> = {
  DEFAULT: { dailyCap: 100, decayFactor: 0.6 },
  LESSON: { dailyCap: 150, decayFactor: 0.7, winBonus: 1.3 },
  QUICK_PRACTICE: { dailyCap: 60, decayFactor: 0.5 },
  CHAPTER_GUESS: { dailyCap: 80, decayFactor: 0.6, levelMultiplier: { BEGINNER: 1, ADVANCED: 1.25, EXPERT: 1.5 } },
  WORD_GAME: { dailyCap: 50, decayFactor: 1 },
  PODCAST_LESSON: { dailyCap: 80, decayFactor: 0.7 },
  KIDS_STORY: { dailyCap: 80, decayFactor: 0.7 },
  SCRABBLE_WON: { dailyCap: 60, decayFactor: 0.7 },
  SCRABBLE_PLAYED: { dailyCap: 30, decayFactor: 0.7 },
  CHALLENGE_WON: { dailyCap: 60, decayFactor: 0.7 },
};

const DEFAULT_SETTINGS: LeagueSettingsView = {
  groupSize: 30,
  promoteCount: 3,
  demoteCount: 3,
  minGroupSizeForMovement: 10,
  seasonWeekCount: 6,
  localeCode: "nl-NL",
  activityRules: DEFAULT_ACTIVITY_RULES,
};

/**
 * Eén configuratierij voor alles wat niet op meerdere plekken hardgecodeerd
 * hoort te staan (groepsgrootte, promotie/degradatie-aantallen, seizoensduur,
 * per-activiteit XP-regels) — zelfde singleton-patroon (`id="singleton"`) als
 * EmailSettings/BrandingSettings. Werkt zowel binnen een transactie als
 * daarbuiten (zie hoe resolveStartingTier hierboven al langer de volledige
 * `prisma`-client accepteert waar een Prisma.TransactionClient verwacht
 * wordt).
 */
export async function getLeagueSettings(tx: Tx): Promise<LeagueSettingsView> {
  const row = await tx.leagueSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return DEFAULT_SETTINGS;

  let activityRules: Record<string, ActivityRule>;
  try {
    activityRules = JSON.parse(row.activityRules);
  } catch {
    activityRules = DEFAULT_ACTIVITY_RULES;
  }

  return {
    groupSize: row.groupSize,
    promoteCount: row.promoteCount,
    demoteCount: row.demoteCount,
    minGroupSizeForMovement: row.minGroupSizeForMovement,
    seasonWeekCount: row.seasonWeekCount,
    localeCode: row.localeCode,
    activityRules,
  };
}

export function activityRuleFor(settings: LeagueSettingsView, activityKey: string): ActivityRule {
  return settings.activityRules[activityKey] ?? settings.activityRules.DEFAULT ?? DEFAULT_ACTIVITY_RULES.DEFAULT;
}

function previousWeekStart(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Zoekt een niet-volle groep voor (weekStart, tier) en claimt er atomisch een
 * plek in (zelfde updateMany-guard-patroon als de hint-tegoeden bij
 * ChapterGuessGame/ScrabbleGame — voorkomt dat een groep door een race
 * conditie voorbij `size` vol raakt), of maakt een nieuwe groep aan als ze
 * allemaal vol zijn. Bij een gelijktijdige aanmaak van dezelfde volgende
 * index (zeldzaam, en onschadelijk bij deze schaal) vangt de unieke index op
 * (weekStart, tier, index) dat af; we proberen dan gewoon opnieuw.
 */
async function assignToGroup(tx: Tx, weekStart: string, tier: LeagueTier, settings: LeagueSettingsView): Promise<string> {
  const existingGroups = await tx.leagueGroup.findMany({
    where: { weekStart, tier },
    orderBy: { index: "asc" },
  });

  for (const group of existingGroups) {
    const claimed = await tx.leagueGroup.updateMany({
      where: { id: group.id, memberCount: { lt: settings.groupSize } },
      data: { memberCount: { increment: 1 } },
    });
    if (claimed.count > 0) return group.id;
  }

  try {
    const created = await tx.leagueGroup.create({
      data: { weekStart, tier, index: existingGroups.length, size: settings.groupSize, memberCount: 1 },
    });
    return created.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return assignToGroup(tx, weekStart, tier, settings); // iemand anders won de race op deze index; probeer opnieuw
    }
    throw e;
  }
}

/** Bepaalt de nieuwe divisie op basis van de positie binnen de groep van vorige week. */
async function resolveTierFromGroup(
  tx: Tx,
  prevScore: { userId: string; tier: LeagueTier; groupId: string },
  settings: LeagueSettingsView
): Promise<LeagueTier> {
  const peers = await tx.weeklyScore.findMany({
    where: { groupId: prevScore.groupId },
    // xp desc, met id als vaste, deterministische tiebreaker (cuid's zijn
    // aanmaakvolgorde) — nodig nu posities ook echt getoond worden.
    orderBy: [{ xp: "desc" }, { id: "asc" }],
    select: { userId: true },
  });
  const rank = peers.findIndex((p) => p.userId === prevScore.userId); // 0-based
  const total = peers.length;
  const tierIndex = TIER_ORDER.indexOf(prevScore.tier);

  if (rank === -1 || total < settings.minGroupSizeForMovement) return prevScore.tier;

  if (rank < settings.promoteCount && tierIndex < TIER_ORDER.length - 1) {
    return TIER_ORDER[tierIndex + 1];
  }
  if (rank >= total - settings.demoteCount && tierIndex > 0) {
    return TIER_ORDER[tierIndex - 1];
  }
  return prevScore.tier;
}

export interface WeeklyPlacement {
  tier: LeagueTier;
  groupId: string;
}

/**
 * Bepaalt in welke divisie én groep een gebruiker deze week start, op basis
 * van hun positie in hun groep van vorige week (top `promoteCount` promoveert,
 * onderste `demoteCount` degradeert, Brons/Legende zijn vloer/plafond) en
 * wijst ze meteen in een groep voor de huidige week. Wordt "lazy" aangeroepen
 * zodra iemand voor het eerst deze week XP verdient (zie applyWeeklyXp in
 * streak.ts) in plaats van via een wekelijkse cron-taak — functioneel
 * gelijkwaardig, zonder extra infra.
 *
 * Als iemand exact vorige week geen rij heeft (nooit gespeeld, of een pauze
 * genomen) tellen we ze als nieuw en starten ze weer in Brons — dat was al
 * zo vóór groepen bestonden en blijft bewust ongewijzigd (een ander gedrag
 * hiervoor is een aparte productbeslissing, geen onderdeel van deze uitbreiding).
 */
export async function resolveWeeklyPlacement(tx: Tx, userId: string, weekStart: string): Promise<WeeklyPlacement> {
  const settings = await getLeagueSettings(tx);
  const prevWeek = previousWeekStart(weekStart);
  const prevScore = await tx.weeklyScore.findUnique({
    where: { userId_weekStart: { userId, weekStart: prevWeek } },
  });

  let tier: LeagueTier;
  if (!prevScore) {
    tier = "BRONZE";
  } else if (!prevScore.groupId) {
    // Kan in theorie niet meer voorkomen na de backfill-migratie, maar geen
    // enkele historische rij mag ooit een crash veroorzaken — gewoon in
    // dezelfde divisie laten staan.
    tier = prevScore.tier;
  } else {
    tier = await resolveTierFromGroup(tx, { userId, tier: prevScore.tier, groupId: prevScore.groupId }, settings);
  }

  const groupId = await assignToGroup(tx, weekStart, tier, settings);
  return { tier, groupId };
}

/**
 * Wekelijkse competitie-XP bijwerken (of de rij voor deze week aanmaken,
 * inclusief divisie/groep/seizoen). Geëxporteerd zodat elke plek die
 * competitie-XP toekent (awardCompetitionXp) óf XP afschrijft (zie
 * src/lib/shop.ts — hints/freezes kopen kost XP) de divisiestand in sync
 * houdt; anders loopt "XP" in de winkel en "XP" in de competitie uiteen
 * zodra iemand XP uitgeeft. Staat hier (niet in streak.ts) om een
 * circulaire import met competitionXp.ts te vermijden — dat bestand roept
 * dit weer aan nadat het de dagelijkse cap/afname heeft toegepast.
 */
export async function applyWeeklyXp(tx: Tx, userId: string, xp: number): Promise<void> {
  const weekStart = weekStartKey();
  const existing = await tx.weeklyScore.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
  if (existing) {
    await tx.weeklyScore.update({ where: { userId_weekStart: { userId, weekStart } }, data: { xp: { increment: xp } } });
  } else {
    const { tier, groupId } = await resolveWeeklyPlacement(tx, userId, weekStart);
    const activeSeason = await tx.season.findFirst({ where: { status: "ACTIVE" } });
    await tx.weeklyScore.create({ data: { userId, weekStart, xp, tier, groupId, seasonId: activeSeason?.id } });
  }
}
