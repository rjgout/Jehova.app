import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { formatTag } from "@/lib/handle";
import { notifyActivityReaction } from "@/lib/notify";

const REACTIONS = ["🫶🏻", "❤️", "🎉", "🔥", "🙌"] as const;
const schema = z.object({ emoji: z.enum(REACTIONS) });

async function visibleItem(itemId: string, userId: string): Promise<{ userId: string } | null> {
  const item = await prisma.activityFeedItem.findUnique({ where: { id: itemId }, select: { userId: true } });
  if (!item || item.userId === userId) return null;
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: userId, receiverId: item.userId },
        { senderId: item.userId, receiverId: userId },
      ],
    },
    select: { id: true },
  });
  return friendship ? item : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  const { itemId } = await params;
  const item = await visibleItem(itemId, user.id);
  if (!item) return await apiError("apiErrors.forbidden", 403);

  const existing = await prisma.activityFeedReaction.findUnique({
    where: { itemId_userId: { itemId, userId: user.id } },
    select: { emoji: true },
  });
  if (existing?.emoji === parsed.data.emoji) {
    await prisma.activityFeedReaction.delete({ where: { itemId_userId: { itemId, userId: user.id } } });
    return NextResponse.json({ emoji: null });
  }
  const reaction = await prisma.activityFeedReaction.upsert({
    where: { itemId_userId: { itemId, userId: user.id } },
    update: { emoji: parsed.data.emoji },
    create: { itemId, userId: user.id, emoji: parsed.data.emoji },
    select: { emoji: true },
  });
  if (!existing) {
    await notifyActivityReaction(
      item.userId,
      formatTag(user.handle, user.discriminator),
      reaction.emoji
    ).catch(() => {});
  }
  return NextResponse.json({ emoji: reaction.emoji });
}
