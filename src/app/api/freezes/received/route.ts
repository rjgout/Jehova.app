import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ gifts: [] });

  const gifts = await prisma.freezeTransaction.findMany({
    where: { userId: user.id, type: "GIFT_RECEIVED", seenAt: null },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      related: { select: { handle: true, discriminator: true, avatarEmoji: true } },
    },
  });

  return NextResponse.json({
    gifts: gifts.map((gift) => ({
      id: gift.id,
      createdAt: gift.createdAt,
      sender: gift.related
        ? { handle: gift.related.handle, discriminator: gift.related.discriminator, avatarEmoji: gift.related.avatarEmoji }
        : null,
    })),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  await prisma.freezeTransaction.updateMany({
    where: { userId: user.id, type: "GIFT_RECEIVED", seenAt: null },
    data: { seenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
