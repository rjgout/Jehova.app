import type { Prisma } from "@/generated/prisma/client";
import { dayKey, weekStartKey } from "@/lib/dates";
import { getLeagueSettings, activityRuleFor, applyWeeklyXp } from "@/lib/leagues";

type Tx = Prisma.TransactionClient;

/**
 * De competitie-XP-ledger (CompetitionXpEvent) staat los van XPTransaction
 * (algemene XP, ongelimiteerd — zie src/lib/xp.ts, die blijft ongewijzigd).
 * Reden voor die scheiding: competitie-XP heeft per-activiteit dagelijkse
 * limieten en afnemende meeropbrengst nodig (sectie 8 van het productplan)
 * zonder de algemene XP-economie (winkelaankopen, xpTotal, achievements) aan
 * te raken, én twee activiteiten (Woordspel/Scrabble, Uitdagingen) leveren
 * bewust NUL algemene XP op maar tellen wel mee voor de competitie.
 *
 * Elke aanroeper geeft hetzelfde "ruwe" bedrag door dat ook naar de
 * algemene XP-toekenning ging (of, voor Scrabble/Uitdagingen, een vast
 * winbedrag) — deze functie is de ENIGE plek die daar een dagelijkse cap en
 * afnemende meeropbrengst op toepast, dus een toekomstige activiteit hoeft
 * alleen deze functie aan te roepen, niet de leaderboard-architectuur aan te
 * passen (sectie 9).
 *
 * Wordt uitsluitend server-side aangeroepen vanuit reeds gevalideerde
 * afrondpunten (de complete*-functies in streak.ts, en de win-momenten in
 * scrabbleGame.ts/challenges.ts) — nooit rechtstreeks vanuit een
 * client-aanvraag, dus er is geen client-input om te vertrouwen of te
 * misbruiken.
 */
export async function awardCompetitionXp(
  tx: Tx,
  userId: string,
  activityKey: string,
  rawAmount: number,
  opts?: { won?: boolean; level?: string; metadata?: Record<string, unknown> }
): Promise<number> {
  if (rawAmount <= 0) return 0;

  const settings = await getLeagueSettings(tx);
  const rule = activityRuleFor(settings, activityKey);
  const today = dayKey();
  const weekStart = weekStartKey();

  // Beloningsvorm zit hier, niet bij de aanroeper: "moeilijkere spelmodus"
  // en "een spel winnen" leveren meer competitie-XP op via de configureerbare
  // winBonus/levelMultiplier van deze activiteit (sectie 8/9 van het
  // productplan) — een aanroeper geeft alleen aan of iets gewonnen is of op
  // welk niveau gespeeld werd, nooit hoeveel dat waard is.
  let multiplier = 1;
  if (opts?.won && rule.winBonus) multiplier *= rule.winBonus;
  if (opts?.level && rule.levelMultiplier?.[opts.level]) multiplier *= rule.levelMultiplier[opts.level];

  const agg = await tx.competitionXpEvent.aggregate({
    where: { userId, activityKey, dayKey: today },
    _count: true,
    _sum: { awardedAmount: true },
  });
  const countToday = agg._count;
  const sumToday = agg._sum.awardedAmount ?? 0;

  const decayed = Math.floor(rawAmount * multiplier * Math.pow(rule.decayFactor, countToday));
  const remainingCap = Math.max(0, rule.dailyCap - sumToday);
  const awarded = Math.max(0, Math.min(decayed, remainingCap));

  await tx.competitionXpEvent.create({
    data: {
      userId,
      activityKey,
      dayKey: today,
      weekStart,
      rawAmount,
      awardedAmount: awarded,
      metadata: opts?.metadata ? JSON.stringify(opts.metadata) : undefined,
    },
  });

  // Altijd aanroepen, ook bij awarded === 0: dat zorgt dat vandaag actief
  // zijn (ook al is de dagcap al bereikt) je meteen in een groep voor deze
  // week zet, in plaats van pas zodra je een keer XP ONDER de cap verdient.
  await applyWeeklyXp(tx, userId, awarded);

  return awarded;
}
