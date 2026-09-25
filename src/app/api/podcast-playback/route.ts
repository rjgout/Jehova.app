import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const EPISODE_SELECT = { id: true, number: true, title: true, audioUrl: true } as const;

// Zonder ?episodeId: geeft de meest recent afgespeelde, nog niet
// afgeluisterde aflevering terug — voor het herstellen van de mini-player
// bij het (opnieuw) laden van de app (zie PodcastPlayerProvider).
// Met ?episodeId: geeft alleen de opgeslagen positie voor die specifieke
// aflevering terug — voor het hervatten vanaf een episodekaart die niet de
// laatst-afgespeelde is.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ episode: null, positionSeconds: 0 });

  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (episodeId) {
    const progress = await prisma.podcastPlaybackProgress.findUnique({
      where: { userId_episodeId: { userId: user.id, episodeId } },
    });
    return NextResponse.json({ positionSeconds: progress?.positionSeconds ?? 0 });
  }

  const latest = await prisma.podcastPlaybackProgress.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { episode: { select: EPISODE_SELECT } },
  });
  if (!latest || !latest.episode.audioUrl) return NextResponse.json({ episode: null, positionSeconds: 0 });

  return NextResponse.json({ episode: latest.episode, positionSeconds: latest.positionSeconds });
}

const putSchema = z.object({ episodeId: z.string().min(1), positionSeconds: z.number().min(0) });

// Wordt periodiek aangeroepen tijdens het afspelen, en bij pauzeren/de
// pagina verlaten (zie PodcastPlayerProvider) — bewust geen validatie of
// deze aflevering al bijna afgelopen is: dat bepaalt de client (zie
// FINISHED_REMAINING_SECONDS), die roept in dat geval DELETE hieronder aan.
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  await prisma.podcastPlaybackProgress.upsert({
    where: { userId_episodeId: { userId: user.id, episodeId: parsed.data.episodeId } },
    create: { userId: user.id, episodeId: parsed.data.episodeId, positionSeconds: parsed.data.positionSeconds },
    update: { positionSeconds: parsed.data.positionSeconds },
  });
  return NextResponse.json({ ok: true });
}

// Wist de opgeslagen positie — aangeroepen zodra een aflevering (bijna)
// helemaal is afgeluisterd, zodat een volgende keer weer bij het begin
// begint i.p.v. bij de laatste paar seconden.
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const episodeId = req.nextUrl.searchParams.get("episodeId");
  if (!episodeId) return await apiError("apiErrors.episodeIdMissing", 400);

  await prisma.podcastPlaybackProgress.deleteMany({ where: { userId: user.id, episodeId } });
  return NextResponse.json({ ok: true });
}
