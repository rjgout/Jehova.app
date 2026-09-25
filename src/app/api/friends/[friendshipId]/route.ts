import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { friendshipId } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });

  if (!friendship || (friendship.senderId !== user.id && friendship.receiverId !== user.id)) {
    return await apiError("apiErrors.friendshipNotFound", 404);
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
  return NextResponse.json({ ok: true });
}
