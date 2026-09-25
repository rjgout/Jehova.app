import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { weekStartKey } from "@/lib/dates";
import { getLeagueSettings, movementCounts, tierForWeek, TIER_ORDER } from "@/lib/leagues";
import { apiError } from "@/lib/apiError";

type Zone = "PROMOTION" | "SAFE" | "RELEGATION";

function zoneFor(rank: number, total: number, promoteCount: number, demoteCount: number): Zone {
  if (rank <= promoteCount) return "PROMOTION";
  if (rank > total - demoteCount) return "RELEGATION";
  return "SAFE";
}

const NATIONAL_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const scopeParam = req.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "friends" ? "friends" : scopeParam === "national" ? "national" : "league";
  const weekStart = weekStartKey();

  if (scope === "national") {
    // De permanente Nederlandse ranglijst: op User.xpTotal, dezelfde cache als
    // overal elders in de app. Dat is het XP-saldo, geen levenslange som:
    // aankopen in de winkel gaan er vanaf (zie src/lib/shop.ts). Bewust een ander
    // getal/mechanisme dan de wekelijkse, gelimiteerde competitie-XP
    // hieronder — dit is geen kopie van de wekelijkse competitie, maar een
    // apart, langetermijn antwoord op "hoe doe ik het over lange tijd".
    const top = await prisma.user.findMany({
      orderBy: [{ xpTotal: "desc" }, { id: "asc" }],
      take: NATIONAL_PAGE_SIZE,
      select: { id: true, handle: true, xpTotal: true, currentStreak: true },
    });

    const myRankAmongHigher = await prisma.user.count({
      where: {
        OR: [{ xpTotal: { gt: user.xpTotal } }, { AND: [{ xpTotal: user.xpTotal }, { id: { lt: user.id } }] }],
      },
    });
    const myRank = myRankAmongHigher + 1;

    if (!user.bestNationalRank || myRank < user.bestNationalRank) {
      await prisma.user.update({ where: { id: user.id }, data: { bestNationalRank: myRank } }).catch(() => {});
    }

    const ids = top.map((u) => u.id);
    const weekScores = await prisma.weeklyScore.findMany({
      where: { weekStart, userId: { in: ids } },
      select: { userId: true, tier: true },
    });
    const tierByUser = new Map(weekScores.map((s) => [s.userId, s.tier]));

    const entries = top.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      handle: u.handle,
      xpTotal: u.xpTotal,
      currentStreak: u.currentStreak,
      tier: tierByUser.get(u.id) ?? null,
      isMe: u.id === user.id,
    }));

    const meInTop = entries.some((e) => e.isMe);

    return NextResponse.json({
      scope,
      entries,
      me: meInTop
        ? null
        : {
            rank: myRank,
            userId: user.id,
            handle: user.handle,
            xpTotal: user.xpTotal,
            currentStreak: user.currentStreak,
            tier: tierByUser.get(user.id) ?? null,
          },
    });
  }

  const settings = await getLeagueSettings(prisma);
  const myScore = await prisma.weeklyScore.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
  });
  // Nog geen XP deze week: de divisie die je krijgt zodra je begint (zie
  // tierForWeek), niet Zaad.
  const myTier = myScore?.tier ?? (await tierForWeek(prisma, user.id, weekStart));
  // Hoogste divisie ooit (voor de divisiebalk in de hero): een seizoen zet
  // de divisies niet terug, dus dit telt over alle weken heen.
  const reachedTiers = await prisma.weeklyScore.findMany({
    where: { userId: user.id },
    select: { tier: true },
    distinct: ["tier"],
  });
  const highestTier = [myTier, ...reachedTiers.map((r) => r.tier)].reduce((best, tier) =>
    TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(best) ? tier : best
  );

  let userIds: string[] | undefined;
  if (scope === "friends") {
    const friendships = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
    });
    const friendIds = friendships.map((f) => (f.senderId === user.id ? f.receiverId : f.senderId));
    userIds = [user.id, ...friendIds];
  }

  const scores = await prisma.weeklyScore.findMany({
    where: {
      weekStart,
      // "league": binnen je eigen groep van ~30 spelers, niet de hele
      // divisie — zie resolveWeeklyPlacement in src/lib/leagues.ts. Zonder
      // groupId (zou na de backfill-migratie niet meer moeten voorkomen)
      // valt dit terug op "toon alleen mezelf", nooit op de hele divisie.
      ...(scope === "league" ? { groupId: myScore?.groupId ?? "__none__" } : {}),
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    include: { user: { select: { id: true, handle: true } } },
    orderBy: [{ xp: "desc" }, { id: "asc" }],
  });

  const total = scores.length;
  // Zelfde aantallen als de wekelijkse plaatsing (movementCounts); in de
  // laagste divisie degradeert niemand, in de hoogste promoveert niemand.
  const counts = movementCounts(total, settings);
  const promoteCount = myTier === TIER_ORDER[TIER_ORDER.length - 1] ? 0 : counts.promote;
  const demoteCount = myTier === TIER_ORDER[0] ? 0 : counts.demote;
  const entries = scores.map((s, i) => {
    const rank = i + 1;
    return {
      rank,
      userId: s.user.id,
      handle: s.user.handle,
      xp: s.xp,
      tier: s.tier,
      isMe: s.user.id === user.id,
      zone: scope === "league" ? zoneFor(rank, total, promoteCount, demoteCount) : null,
    };
  });

  // "Nog X XP tot promotie/veiligheid" (sectie 6/12 van het productplan) —
  // server-side berekend op basis van dezelfde instellingen die de
  // daadwerkelijke promotie/degradatie bepalen, zodat de client nooit zelf
  // hoeft te "beslissen" wat er telt.
  let xpGap: { toward: "PROMOTION" | "SAFETY" | "FIRST_PLACE"; xp: number } | null = null;
  if (scope === "league" && total > 0) {
    const meIndex = entries.findIndex((e) => e.isMe);
    if (meIndex !== -1) {
      const me = entries[meIndex];
      if (me.zone === "RELEGATION") {
        const lastSafeIndex = total - demoteCount - 1;
        if (lastSafeIndex >= 0) {
          xpGap = { toward: "SAFETY", xp: Math.max(0, scores[lastSafeIndex].xp - me.xp + 1) };
        }
      } else if (me.zone === "SAFE" && promoteCount > 0) {
        const lastPromotionIndex = promoteCount - 1;
        xpGap = { toward: "PROMOTION", xp: Math.max(0, scores[lastPromotionIndex].xp - me.xp + 1) };
      } else if (me.zone === "PROMOTION" && meIndex > 0) {
        xpGap = { toward: "FIRST_PLACE", xp: Math.max(0, scores[0].xp - me.xp + 1) };
      }
    }
  }

  return NextResponse.json({
    weekStart,
    scope,
    myTier,
    highestTier,
    promoteCount,
    demoteCount,
    hasActivityThisWeek: Boolean(myScore),
    xpGap,
    // Bewust de handle (gekozen gebruikersnaam) i.p.v. displayName (echte
    // naam) — die is hier nergens voor nodig (zoeken gaat via handle#discri-
    // minator, niet op naam), dus geen reden om 'm hier te tonen.
    entries,
  });
}
