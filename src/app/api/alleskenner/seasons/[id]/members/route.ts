import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { areFriends, isSeasonManager, loadSeasonFor } from "@/lib/alleskenner/season";

const schema = z.object({ userId: z.string().min(1) });

// Lid toevoegen: achteraan de wachtrij, tot de seizoensfinale begint. Alleen
// vrienden van de host/vervangende host (of die zelf), zodat je niet
// zomaar iemand kunt toevoegen die je niet kent.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });
  if (!isSeasonManager(season, user.id)) return NextResponse.json({ error: "Alleen de host kan leden toevoegen." }, { status: 403 });
  if (season.status !== "REGULAR") return NextResponse.json({ error: "Na de start van de seizoensfinale kunnen er geen leden meer bij." }, { status: 409 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });
  const { userId } = parsed.data;
  if (userId !== user.id && !(await areFriends(user.id, userId))) {
    return NextResponse.json({ error: "Je kunt alleen vrienden toevoegen." }, { status: 403 });
  }
  if (season.members.some((m) => m.userId === userId)) return NextResponse.json({ ok: true });

  const last = season.members.reduce((max, m) => Math.max(max, m.queuePosition), -1);
  await prisma.alleskennerSeasonMember.create({ data: { seasonId: id, userId, queuePosition: last + 1 } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

// Alleen wie nog in de wachtrij staat kan eruit: wie al gespeeld heeft, hoort
// bij de uitslagen van het seizoen.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });
  const { userId } = parsed.data;
  // Een lid mag zichzelf uit de wachtrij halen; de host iedereen.
  if (!isSeasonManager(season, user.id) && userId !== user.id) {
    return NextResponse.json({ error: "Alleen de host kan leden verwijderen." }, { status: 403 });
  }
  const member = season.members.find((m) => m.userId === userId);
  if (!member) return NextResponse.json({ ok: true });
  if (member.status !== "WAITING" || member.evenings > 0) {
    return NextResponse.json({ error: "Wie al gespeeld heeft, blijft in het seizoen." }, { status: 409 });
  }
  if (season.hostId === userId || season.deputyHostId === userId) {
    return NextResponse.json({ error: "Draag eerst de hostrol over." }, { status: 409 });
  }
  await prisma.alleskennerSeasonMember.delete({ where: { id: member.id } });
  return NextResponse.json({ ok: true });
}
