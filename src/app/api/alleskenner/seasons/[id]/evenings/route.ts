import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { createAlleskennerGame } from "@/lib/alleskenner/game";
import { isSeasonManager, loadSeasonFor, openEvening, planEvening } from "@/lib/alleskenner/season";

const schema = z.object({ absentIds: z.array(z.string()).max(200) });

// Start een seizoensavond: de opstelling wordt hier vastgelegd (met de
// afwezigen die de host aanvinkt), daarna gaat iedereen naar de lobby. Leden
// krijgen hun uitnodiging zodra de host de lobby opent (src/server/alleskenner.ts).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) {
    return NextResponse.json({ error: "De Alleskenner staat (nog) niet aan." }, { status: 403 });
  }
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });
  if (!isSeasonManager(season, user.id)) return NextResponse.json({ error: "Alleen de host kan een avond starten." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });

  // Er loopt al een avond: daarheen, in plaats van een tweede.
  const open = openEvening(season.evenings);
  if (open) return NextResponse.json({ code: open.game!.code });

  const plan = planEvening(season, season.members, parsed.data.absentIds);
  if (plan.error) return NextResponse.json({ error: plan.error }, { status: 409 });

  // Oude, nooit gespeelde avonden (lobby geannuleerd) netjes afsluiten.
  await prisma.alleskennerEvening.updateMany({ where: { seasonId: id, status: "PLANNED" }, data: { status: "CANCELLED" } });
  const number = season.evenings.filter((e) => e.status === "DONE").length + 1;
  const game = await createAlleskennerGame(user.id);
  await prisma.alleskennerEvening.create({
    data: {
      seasonId: id,
      number,
      isFinale: plan.isFinale,
      isLast: plan.isLast,
      gameId: game.id,
      lineup: JSON.stringify(plan.lineup),
      newcomers: JSON.stringify(plan.newcomers),
    },
  });
  return NextResponse.json({ code: game.code });
}
