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
  ALLESKENNER_SOLO: { dailyCap: 80, decayFactor: 0.7 },
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

/**
 * Hoeveel spelers promoveren/degraderen in een groep van `total` spelers
 * (alleen wie die week XP verdiende telt). Een volle groep volgt de
 * instellingen (standaard 3 op 30); een kleinere groep dezelfde verhouding,
 * afgerond, met altijd minstens één promotie: anders komt bij weinig spelers
 * nooit iemand vooruit. Voorbeelden bij 3 op 30: 1-4 spelers 1 omhoog en
 * niemand omlaag, 5-14 spelers 1/1, 15-24 spelers 2/2, vanaf 25 spelers 3/3.
 * Gedeeld door de wekelijkse plaatsing en het klassement, zodat wat je ziet
 * altijd klopt met wat er gebeurt.
 */
export function movementCounts(total: number, settings: LeagueSettingsView): { promote: number; demote: number } {
  if (total <= 0) return { promote: 0, demote: 0 };
  if (total >= settings.groupSize) return { promote: settings.promoteCount, demote: settings.demoteCount };
  const promote = Math.min(total, Math.max(1, Math.round((total * settings.promoteCount) / settings.groupSize)));
  const demote = Math.min(total - promote, Math.round((total * settings.demoteCount) / settings.groupSize));
  return { promote, demote };
}

function previousWeekStart(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Wijst een speler een groep toe voor (weekStart, tier). Het aantal groepen
 * wordt bij de eerste speler van die week geschat op basis van hoeveel
 * spelers vorige week in deze divisie zaten, en spelers worden daarover
 * gelijk verdeeld (steeds de minst gevulde groep): 31 spelers worden dan 16
 * en 15, niet 30 en één speler alleen. Zijn alle groepen toch vol (meer
 * spelers dan geschat), dan komt er een groep bij.
 *
 * Een plek claimen gebeurt atomisch (updateMany met de grootte als
 * voorwaarde), zodat een groep door een race conditie nooit voorbij `size`
 * vol raakt; bij een gelijktijdige aanmaak van dezelfde index vangt de
 * unieke index op (weekStart, tier, index) dat af en proberen we opnieuw.
 */
async function assignToGroup(tx: Tx, weekStart: string, tier: LeagueTier, settings: LeagueSettingsView): Promise<string> {
  let groups = await tx.leagueGroup.findMany({ where: { weekStart, tier }, orderBy: { index: "asc" } });

  if (groups.length === 0) {
    const expected = await tx.weeklyScore.count({ where: { weekStart: previousWeekStart(weekStart), tier } });
    const count = Math.max(1, Math.ceil(expected / settings.groupSize));
    await tx.leagueGroup.createMany({
      data: Array.from({ length: count }, (_, index) => ({ weekStart, tier, index, size: settings.groupSize, memberCount: 0 })),
      skipDuplicates: true,
    });
    groups = await tx.leagueGroup.findMany({ where: { weekStart, tier }, orderBy: { index: "asc" } });
  }

  for (const group of [...groups].sort((a, b) => a.memberCount - b.memberCount || a.index - b.index)) {
    const claimed = await tx.leagueGroup.updateMany({
      where: { id: group.id, memberCount: { lt: settings.groupSize } },
      data: { memberCount: { increment: 1 } },
    });
    if (claimed.count > 0) return group.id;
  }

  try {
    const created = await tx.leagueGroup.create({
      data: { weekStart, tier, index: groups.length, size: settings.groupSize, memberCount: 1 },
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
  const { promote, demote } = movementCounts(total, settings);

  if (rank === -1) return prevScore.tier;

  if (rank < promote && tierIndex < TIER_ORDER.length - 1) {
    return TIER_ORDER[tierIndex + 1];
  }
  if (rank >= total - demote && tierIndex > 0) {
    return TIER_ORDER[tierIndex - 1];
  }
  return prevScore.tier;
}

export interface WeeklyPlacement {
  tier: LeagueTier;
  groupId: string;
}

/**
 * In welke divisie een gebruiker deze week hoort, op basis van zijn laatste
 * week met XP: zijn positie in de groep van die week (zie movementCounts,
 * Zaad/Eeuwigheid zijn vloer/plafond). Een week (of langer) niet oefenen
 * verandert niets: je blijft waar je was. Alleen wie nog nooit XP verdiende,
 * begint in Zaad.
 *
 * Puur rekenen, raakt geen groepen aan: ook bruikbaar om te tonen welke
 * divisie je krijgt (klassement) of om de weekuitslag te melden (scheduler).
 */
export async function tierForWeek(tx: Tx, userId: string, weekStart: string): Promise<LeagueTier> {
  const lastScore = await tx.weeklyScore.findFirst({
    where: { userId, weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
  });
  if (!lastScore) return "BRONZE";
  // Zonder groep (oude rijen van vóór de groepen): gewoon in dezelfde divisie.
  if (!lastScore.groupId) return lastScore.tier;
  const settings = await getLeagueSettings(tx);
  return resolveTierFromGroup(tx, { userId, tier: lastScore.tier, groupId: lastScore.groupId }, settings);
}

/**
 * Divisie én groep voor deze week. Wordt "lazy" aangeroepen zodra iemand
 * voor het eerst deze week XP verdient (zie applyWeeklyXp) in plaats van via
 * een wekelijkse cron-taak — functioneel gelijkwaardig, zonder extra infra.
 * Claimt een plek in een groep: dus alleen aanroepen als de speler deze week
 * echt meedoet, nooit om alleen iets te tonen (daarvoor is tierForWeek).
 */
export async function resolveWeeklyPlacement(tx: Tx, userId: string, weekStart: string): Promise<WeeklyPlacement> {
  const settings = await getLeagueSettings(tx);
  const tier = await tierForWeek(tx, userId, weekStart);
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
