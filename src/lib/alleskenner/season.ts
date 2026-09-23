import type { AlleskennerSeason, AlleskennerSeasonMember } from "@prisma/client";
import { prisma } from "@/lib/db";

// Seizoenslogica van De Alleskenner (zie docs/ALLESKENNER.md, "Seizoen").
// Wordt gebruikt door de seizoensroutes én door de spelserver
// (src/server/alleskenner.ts) — dus onderdeel van de eager-importketen van
// server.ts: hier nooit request-scoped Next-API's importeren.

export const SEASON_MIN_MEMBERS = 4;
export const SEASON_MAX_EVENINGS = 3;
export const SEASON_LINEUP = 3;

type Member = Pick<
  AlleskennerSeasonMember,
  "userId" | "status" | "queuePosition" | "evenings" | "points" | "secondsTotal" | "finaleSeed" | "finaleEntered" | "finaleOut" | "joinedAt"
>;

/** Klassement: seizoenspunten, bij gelijkstand de totaal verdiende seconden. */
export function rankMembers<M extends Member>(members: M[]): M[] {
  return [...members].sort(
    (a, b) =>
      b.points - a.points ||
      b.secondsTotal - a.secondsTotal ||
      a.queuePosition - b.queuePosition
  );
}

export function isSeasonManager(season: Pick<AlleskennerSeason, "hostId" | "deputyHostId">, userId: string): boolean {
  return season.hostId === userId || season.deputyHostId === userId;
}

export interface EveningPlan {
  lineup: string[]; // speelvolgorde: nieuwkomers eerst (zij krijgen de eerste vraag)
  newcomers: string[];
  isFinale: boolean;
  isLast: boolean;
  error: string | null;
}

/** Klaar voor de seizoensfinale: wachtrij leeg en geen drie spelers meer voor een gewone avond. */
export function finaleReady(season: Pick<AlleskennerSeason, "status">, members: Member[], doneEvenings: number): boolean {
  if (season.status !== "REGULAR" || doneEvenings === 0) return false;
  const waiting = members.filter((m) => m.status === "WAITING").length;
  const active = members.filter((m) => m.status === "ACTIVE").length;
  return waiting === 0 && active < SEASON_LINEUP;
}

/**
 * Wie speelt de volgende avond. Afwezigen slaan over maar houden hun plek:
 * een afwezige blijver houdt zijn resterende avonden, een afwezige finalist
 * stapt later in.
 */
export function planEvening(
  season: Pick<AlleskennerSeason, "status">,
  members: Member[],
  absentIds: string[]
): EveningPlan {
  const present = (m: Member) => !absentIds.includes(m.userId);
  const byQueue = (a: Member, b: Member) => a.queuePosition - b.queuePosition;

  if (season.status === "FINISHED") {
    return { lineup: [], newcomers: [], isFinale: false, isLast: false, error: "Dit seizoen is afgelopen." };
  }

  if (season.status === "FINALE") {
    const finalists = members.filter((m) => m.finaleSeed !== null && !m.finaleOut);
    const inPlay = finalists.filter((m) => m.finaleEntered).sort(byQueue);
    const waiting = finalists.filter((m) => !m.finaleEntered).sort((a, b) => a.finaleSeed! - b.finaleSeed!);
    const stayers = inPlay.filter(present);
    const entering = waiting.filter(present).slice(0, SEASON_LINEUP - stayers.length);
    const lineup = [...entering, ...stayers].map((m) => m.userId);
    if (lineup.length < SEASON_LINEUP) {
      return { lineup, newcomers: [], isFinale: true, isLast: false, error: "Er zijn te weinig finalisten aanwezig." };
    }
    return {
      lineup,
      newcomers: entering.map((m) => m.userId),
      isFinale: true,
      // Laatste avond: er zijn nog precies drie finalisten over, en die spelen nu.
      isLast: finalists.length === SEASON_LINEUP,
      error: null,
    };
  }

  if (members.length < SEASON_MIN_MEMBERS) {
    return { lineup: [], newcomers: [], isFinale: false, isLast: false, error: `Een seizoen heeft minstens ${SEASON_MIN_MEMBERS} leden nodig.` };
  }
  const stayers = members.filter((m) => m.status === "ACTIVE" && present(m)).sort(byQueue).slice(0, SEASON_LINEUP);
  const newcomers = members
    .filter((m) => m.status === "WAITING" && present(m))
    .sort(byQueue)
    .slice(0, SEASON_LINEUP - stayers.length);
  const lineup = [...newcomers, ...stayers].map((m) => m.userId);
  if (lineup.length < SEASON_LINEUP) {
    const absentMatter = members.some((m) => (m.status === "ACTIVE" || m.status === "WAITING") && !present(m));
    return {
      lineup,
      newcomers: newcomers.map((m) => m.userId),
      isFinale: false,
      isLast: false,
      error: absentMatter
        ? "Er zijn te weinig spelers aanwezig voor een avond."
        : "Er zijn geen drie spelers meer voor een gewone avond: tijd voor de seizoensfinale.",
    };
  }
  return { lineup, newcomers: newcomers.map((m) => m.userId), isFinale: false, isLast: false, error: null };
}

/**
 * Start de seizoensfinale: iedereen die ongeslagen is (nooit een finale
 * verloren) doet mee, aangevuld tot drie met de hoogsten uit het klassement.
 * Instapvolgorde: laagst geplaatsten eerst, de nummer 1 stapt als laatste in.
 */
export async function startSeasonFinale(seasonId: string): Promise<string | null> {
  const season = await prisma.alleskennerSeason.findUnique({
    where: { id: seasonId },
    include: { members: true, evenings: { where: { status: "DONE" }, select: { id: true } } },
  });
  if (!season) return "Seizoen niet gevonden.";
  if (!finaleReady(season, season.members, season.evenings.length)) return "De seizoensfinale kan nog niet beginnen.";

  const ranked = rankMembers(season.members);
  const finalists = ranked.filter((m) => m.status === "ACTIVE" || m.status === "RETIRED");
  for (const m of ranked) {
    if (finalists.length >= SEASON_LINEUP) break;
    if (!finalists.includes(m)) finalists.push(m);
  }
  if (finalists.length < SEASON_LINEUP) return "Er zijn te weinig leden voor een seizoensfinale.";
  const seeded = rankMembers(finalists).reverse();

  await prisma.$transaction([
    ...seeded.map((m, seed) =>
      prisma.alleskennerSeasonMember.update({
        where: { id: m.id },
        data: { finaleSeed: seed, finaleEntered: false, finaleOut: false },
      })
    ),
    prisma.alleskennerSeason.update({ where: { id: seasonId }, data: { status: "FINALE" } }),
  ]);
  return null;
}

export interface EveningOutcome {
  // Stand na de rondes (vóór de finale), hoogste eerst.
  afterRounds: { userId: string; seconds: number }[];
  finalists: [string, string];
  winnerId: string;
}

/**
 * Verwerkt de uitslag van een seizoensavond. Gewone avond: hoogste stand na de
 * rondes = Alleskenner van de avond (3 punten, door), finalewinnaar 2 punten
 * (door), verliezer 1 punt en eruit. Na drie avonden stop je ongeslagen.
 * Finaleavonden tellen niet mee voor het klassement (dat bepaalde alleen de
 * instapvolgorde); de laatste levert de Alleskenner van het seizoen op.
 */
export async function recordSeasonEvening(eveningId: string, outcome: EveningOutcome): Promise<void> {
  const evening = await prisma.alleskennerEvening.findUnique({
    where: { id: eveningId },
    include: { season: { include: { members: true } } },
  });
  if (!evening || evening.status !== "PLANNED") return;
  const loserId = outcome.finalists.find((id) => id !== outcome.winnerId)!;
  const safeId = outcome.afterRounds.map((r) => r.userId).find((id) => !outcome.finalists.includes(id)) ?? null;
  const secondsOf = (userId: string) => Math.round(outcome.afterRounds.find((r) => r.userId === userId)?.seconds ?? 0);
  const memberOf = (userId: string) => evening.season.members.find((m) => m.userId === userId);

  const results = evening.isLast
    ? [
        { userId: outcome.winnerId, place: 1, seconds: secondsOf(outcome.winnerId), points: 0 },
        { userId: loserId, place: 2, seconds: secondsOf(loserId), points: 0 },
        ...(safeId ? [{ userId: safeId, place: 3, seconds: secondsOf(safeId), points: 0 }] : []),
      ]
    : [
        ...(safeId ? [{ userId: safeId, place: 1, seconds: secondsOf(safeId), points: evening.isFinale ? 0 : 3 }] : []),
        { userId: outcome.winnerId, place: 2, seconds: secondsOf(outcome.winnerId), points: evening.isFinale ? 0 : 2 },
        { userId: loserId, place: 3, seconds: secondsOf(loserId), points: evening.isFinale ? 0 : 1 },
      ];

  const updates = [];
  for (const result of results) {
    const member = memberOf(result.userId);
    if (!member) continue;
    if (evening.isFinale) {
      const out = evening.isLast ? result.userId !== outcome.winnerId : result.userId === loserId;
      updates.push(
        prisma.alleskennerSeasonMember.update({ where: { id: member.id }, data: { finaleEntered: true, finaleOut: out } })
      );
    } else {
      const evenings = member.evenings + 1;
      const lost = result.userId === loserId;
      updates.push(
        prisma.alleskennerSeasonMember.update({
          where: { id: member.id },
          data: {
            evenings,
            points: { increment: result.points },
            secondsTotal: { increment: result.seconds },
            status: lost ? "ELIMINATED" : evenings >= SEASON_MAX_EVENINGS ? "RETIRED" : "ACTIVE",
          },
        })
      );
    }
  }
  if (evening.isLast) {
    updates.push(
      prisma.alleskennerSeason.update({
        where: { id: evening.seasonId },
        data: { status: "FINISHED", championId: outcome.winnerId, finishedAt: new Date() },
      })
    );
  }
  updates.push(
    prisma.alleskennerEvening.update({
      where: { id: eveningId },
      data: { status: "DONE", results: JSON.stringify(results), finishedAt: new Date() },
    })
  );
  await prisma.$transaction(updates);
}

export async function cancelSeasonEvening(eveningId: string): Promise<void> {
  await prisma.alleskennerEvening.updateMany({ where: { id: eveningId, status: "PLANNED" }, data: { status: "CANCELLED" } });
}

// --- Voor de seizoensroutes ------------------------------------------------------

/** Seizoen met leden en avonden, alleen voor host, vervangende host en leden. */
export async function loadSeasonFor(seasonId: string, userId: string) {
  const season = await prisma.alleskennerSeason.findUnique({
    where: { id: seasonId },
    include: {
      members: { include: { user: { select: { id: true, handle: true } } }, orderBy: { queuePosition: "asc" } },
      evenings: { orderBy: { number: "asc" }, include: { game: { select: { code: true, status: true } } } },
      host: { select: { id: true, handle: true } },
      deputyHost: { select: { id: true, handle: true } },
      champion: { select: { id: true, handle: true } },
    },
  });
  if (!season) return null;
  const allowed = isSeasonManager(season, userId) || season.members.some((m) => m.userId === userId);
  return allowed ? season : null;
}

/** De avond die nu open staat (lobby of bezig), als die er is. */
export function openEvening<E extends { status: string; game: { code: string; status: string } | null }>(evenings: E[]): E | null {
  return (
    evenings.find((e) => e.status === "PLANNED" && e.game && (e.game.status === "LOBBY" || e.game.status === "IN_PROGRESS")) ?? null
  );
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    },
    select: { id: true },
  });
  return friendship !== null;
}
