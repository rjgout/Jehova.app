import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isSeasonManager, loadSeasonFor, startSeasonFinale } from "@/lib/alleskenner/season";
import { apiError } from "@/lib/apiError";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const { id } = await params;
  const season = await loadSeasonFor(id, user.id);
  if (!season) return await apiError("apiErrors.seasonNotFound", 404);
  if (!isSeasonManager(season, user.id)) return await apiError("apiErrors.hostOnlyFinale", 403);
  const error = await startSeasonFinale(id);
  if (error) return NextResponse.json({ error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
