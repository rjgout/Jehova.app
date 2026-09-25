import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Klein en snel, expres gescheiden van /api/profile: wordt vaak opnieuw
// aangeroepen (elke keer als XP verandert, zie src/lib/xpBroadcast.ts) om
// de header-badges (zie NavUserBadges.tsx) bij te werken zonder de hele
// pagina te verversen.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  return NextResponse.json({ xpTotal: user.xpTotal, currentStreak: user.currentStreak });
}
