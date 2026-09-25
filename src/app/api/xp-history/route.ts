import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { weekStartKey } from "@/lib/dates";
import { apiError } from "@/lib/apiError";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { searchParams } = new URL(req.url);
  const skipParam = searchParams.get("skip");
  const skip = skipParam !== null ? Number(skipParam) : 0;
  if (!Number.isInteger(skip) || skip < 0) {
    return await apiError("apiErrors.invalidSkip", 400);
  }

  const transactions = await prisma.xPTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE + 1,
  });

  // Alleen op de eerste pagina nodig (voor de "deze week"-pil in de hero-
  // kaart) — bij "meer laden" onnodig opnieuw optellen.
  let xpThisWeek: number | undefined;
  if (skip === 0) {
    const weekStart = new Date(`${weekStartKey()}T00:00:00.000Z`);
    const agg = await prisma.xPTransaction.aggregate({
      where: { userId: user.id, createdAt: { gte: weekStart }, amount: { gt: 0 } },
      _sum: { amount: true },
    });
    xpThisWeek = agg._sum.amount ?? 0;
  }

  const hasMore = transactions.length > PAGE_SIZE;
  return NextResponse.json({
    transactions: transactions.slice(0, PAGE_SIZE),
    hasMore,
    xpTotal: user.xpTotal,
    ...(xpThisWeek !== undefined ? { xpThisWeek } : {}),
  });
}
