import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Intrekken door de uitdager zolang de ander nog niet heeft gereageerd. Een
// uitdaging in PENDING heeft nog geen scores of XP, dus weghalen is genoeg
// (geen aparte status nodig). Voorwaardelijk verwijderen, zodat een
// uitdaging die net geaccepteerd is niet alsnog verdwijnt.
export async function POST(_req: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { challengeId } = await params;
  const result = await prisma.challenge.deleteMany({
    where: { id: challengeId, senderId: user.id, status: "PENDING" },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Deze uitdaging is al beantwoord." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
