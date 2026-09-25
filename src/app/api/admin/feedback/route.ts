import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const reports = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, handle: true, discriminator: true } } },
  });

  return NextResponse.json({ reports });
}
