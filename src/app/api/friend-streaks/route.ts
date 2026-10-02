import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { inviteFriendStreak, listFriendStreaks, refreshFriendStreaksFor } from "@/lib/social/friendStreaks";
import { socialError } from "@/lib/social/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  await refreshFriendStreaksFor([user.id]);
  return NextResponse.json(await listFriendStreaks(user.id, user.timeZone));
}

const schema = z.object({ friendId: z.string().trim().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  try {
    return NextResponse.json(await inviteFriendStreak(user.id, parsed.data.friendId));
  } catch (error) {
    return socialError(error);
  }
}
