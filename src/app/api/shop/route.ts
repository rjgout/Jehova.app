import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { HINT_PRICE_XP, FREEZE_PRICE_XP } from "@/lib/shop";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  return NextResponse.json({
    xpTotal: user.xpTotal,
    hintBalance: user.hintBalance,
    hintPriceXp: HINT_PRICE_XP,
    freezeCount: user.freezeCount,
    freezePriceXp: FREEZE_PRICE_XP,
  });
}
