import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { finaleReady, isSeasonManager, loadSeasonFor, openEvening, planEvening, rankMembers } from "@/lib/alleskenner/season";

// ?absent=id1,id2 berekent de opstelling van de volgende avond met die afwezigen
// (voorbeeld op de seizoenspagina, vóór de host op "Avond starten" drukt).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });

  const done = season.evenings.filter((e) => e.status === "DONE");
  const open = openEvening(season.evenings);
  const absent = (req.nextUrl.searchParams.get("absent") ?? "").split(",").filter(Boolean);
  const plan = planEvening(season, season.members, absent);
  const nameOf = (userId: string) => season.members.find((m) => m.userId === userId)?.user.handle ?? "Oud-lid";

  return NextResponse.json({
    id: season.id,
    name: season.name,
    status: season.status,
    host: season.host,
    deputyHost: season.deputyHost,
    champion: season.champion,
    canManage: isSeasonManager(season, user.id),
    isHost: season.hostId === user.id,
    finaleReady: finaleReady(season, season.members, done.length),
    openEvening: open ? { number: open.number, code: open.game!.code, isFinale: open.isFinale } : null,
    nextEvening: { lineup: plan.lineup.map((userId) => ({ userId, name: nameOf(userId) })), error: plan.error, isFinale: plan.isFinale, isLast: plan.isLast },
    members: season.members.map((m) => ({
      userId: m.userId,
      name: m.user.handle,
      status: m.status,
      queuePosition: m.queuePosition,
      evenings: m.evenings,
      points: m.points,
      secondsTotal: m.secondsTotal,
      finaleSeed: m.finaleSeed,
      finaleEntered: m.finaleEntered,
      finaleOut: m.finaleOut,
    })),
    ranking: rankMembers(season.members).map((m) => m.userId),
    evenings: done.map((e) => ({
      number: e.number,
      isFinale: e.isFinale,
      isLast: e.isLast,
      finishedAt: e.finishedAt,
      results: (JSON.parse(e.results ?? "[]") as { userId: string; place: number; seconds: number; points: number }[]).map((r) => ({
        ...r,
        name: nameOf(r.userId),
      })),
    })),
  });
}

// Host overdragen of een vaste vervangende host kiezen: alleen de host zelf,
// en alleen aan een lid van het seizoen.
const rolesSchema = z.object({ hostId: z.string().optional(), deputyHostId: z.string().nullable().optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });
  if (season.hostId !== user.id) return NextResponse.json({ error: "Alleen de host kan dit wijzigen." }, { status: 403 });
  const parsed = rolesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });

  const isMember = (userId: string) => season.members.some((m) => m.userId === userId);
  const { hostId, deputyHostId } = parsed.data;
  if (hostId !== undefined && !isMember(hostId)) return NextResponse.json({ error: "Kies een lid van het seizoen." }, { status: 400 });
  if (deputyHostId && !isMember(deputyHostId)) return NextResponse.json({ error: "Kies een lid van het seizoen." }, { status: 400 });

  await prisma.alleskennerSeason.update({
    where: { id },
    data: {
      ...(hostId !== undefined ? { hostId } : {}),
      ...(deputyHostId !== undefined ? { deputyHostId } : {}),
      // Wie host wordt, hoeft niet ook nog vervangende host te zijn.
      ...(hostId !== undefined && hostId === (deputyHostId ?? season.deputyHostId) ? { deputyHostId: null } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
