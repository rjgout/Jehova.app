import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getLeagueSettings } from "@/lib/leagues";

const schema = z
  .object({
    groupSize: z.number().int().min(2).max(500),
    promoteCount: z.number().int().min(0),
    demoteCount: z.number().int().min(0),
    // Niet meer gebruikt (kleinere groepen gaan naar verhouding, zie
    // movementCounts); nog geaccepteerd zodat een oud formulier niet faalt.
    minGroupSizeForMovement: z.number().int().min(1).optional(),
    seasonWeekCount: z.number().int().min(1).max(52),
    localeCode: z.string().trim().min(2).max(10),
    activityRules: z.string().trim().refine((s) => {
      try {
        JSON.parse(s);
        return true;
      } catch {
        return false;
      }
    }, "Ongeldige JSON."),
  })
  .refine((v) => v.promoteCount + v.demoteCount < v.groupSize, {
    message: "Promotie- + degradatieplaatsen moeten kleiner zijn dan de groepsgrootte.",
    path: ["groupSize"],
  });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const settings = await getLeagueSettings(prisma);
  return NextResponse.json({ ...settings, activityRules: JSON.stringify(settings.activityRules, null, 2) });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await prisma.leagueSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
