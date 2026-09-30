import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { getActiveGameStatus } from "@/lib/activeGames";

// Zie src/lib/activeGames.ts. Gebruikt door ActiveGamesBanner bovenaan /live.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  // Persoonlijk en snel veranderend: nergens cachen (browser, geïnstalleerde
  // webapp, of een proxy ertussen).
  return NextResponse.json(await getActiveGameStatus(user), { headers: { "Cache-Control": "private, no-store" } });
}
