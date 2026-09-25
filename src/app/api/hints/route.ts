import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hintBalance: true },
  });

  return NextResponse.json({ hintBalance: current?.hintBalance ?? 0 });
}
