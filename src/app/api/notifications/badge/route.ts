import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationBadgeCount: 0 },
  });

  return NextResponse.json({ ok: true });
}
