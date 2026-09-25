import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { giftFreeze } from "@/lib/streak";
import { apiError, apiErrorText } from "@/lib/apiError";

const schema = z.object({ toUserId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const areFriends = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: user.id, receiverId: parsed.data.toUserId },
        { senderId: parsed.data.toUserId, receiverId: user.id },
      ],
    },
  });
  if (!areFriends) {
    return await apiError("apiErrors.freezeFriendsOnly", 403);
  }

  try {
    await giftFreeze(user.id, parsed.data.toUserId);
  } catch (e) {
    return await apiErrorText(e instanceof Error ? e.message : "Mislukt", 400);
  }

  return NextResponse.json({ ok: true });
}
