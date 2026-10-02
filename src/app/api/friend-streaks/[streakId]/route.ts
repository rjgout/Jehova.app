import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { cancelFriendStreakInvite, respondFriendStreak } from "@/lib/social/friendStreaks";
import { socialError } from "@/lib/social/http";

// Een lopende vriendenreeks kan bewust niet worden beëindigd: alleen een
// uitnodiging accepteren, weigeren of (door de uitnodiger) intrekken.
const schema = z.object({ action: z.enum(["accept", "decline", "cancel"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ streakId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  const { streakId } = await params;
  try {
    if (parsed.data.action === "cancel") await cancelFriendStreakInvite(user.id, streakId);
    else await respondFriendStreak(user.id, streakId, parsed.data.action === "accept");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialError(error);
  }
}
