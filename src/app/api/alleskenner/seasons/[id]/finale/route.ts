import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isSeasonManager, loadSeasonFor, startSeasonFinale } from "@/lib/alleskenner/season";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return NextResponse.json({ error: "Seizoen niet gevonden." }, { status: 404 });
  if (!isSeasonManager(season, user.id)) return NextResponse.json({ error: "Alleen de host kan de finale starten." }, { status: 403 });
  const error = await startSeasonFinale(id);
  if (error) return NextResponse.json({ error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
