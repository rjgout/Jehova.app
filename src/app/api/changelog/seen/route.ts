import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  await prisma.user.update({ where: { id: user.id }, data: { changelogSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
