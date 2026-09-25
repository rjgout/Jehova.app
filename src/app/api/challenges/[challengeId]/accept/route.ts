import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { challengeId } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.receiverId !== user.id) {
    return await apiError("apiErrors.challengeNotFound", 404);
  }
  if (challenge.status !== "PENDING") {
    return await apiError("apiErrors.challengeAlreadyAnswered", 409);
  }

  await prisma.challenge.update({ where: { id: challengeId }, data: { status: "ACCEPTED" } });
  return NextResponse.json({ ok: true });
}
