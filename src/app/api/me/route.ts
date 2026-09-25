import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  return NextResponse.json({
    id: user.id,
    handle: user.handle,
    discriminator: user.discriminator,
    displayName: user.handle,
    xpTotal: user.xpTotal,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    freezeCount: user.freezeCount,
  });
}
