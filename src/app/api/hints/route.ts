import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hintBalance: true },
  });

  return NextResponse.json({ hintBalance: current?.hintBalance ?? 0 });
}
