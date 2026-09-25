import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Persoonlijke sleep-volgorde voor de cursussenlijst (/courses) en de
// spelletjeslijst (/live) — één generiek mechanisme voor beide (zie
// UserListOrder in schema.prisma) i.p.v. twee losse ad-hoc kolommen. Geen
// opgeslagen rijen voor een lijst = val terug op de standaardvolgorde; dat
// bepaalt de aanroepende pagina zelf, deze route levert alleen de rauwe
// itemKey-volgorde.

const listKeySchema = z.enum(["courses", "games"]);

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const parsed = listKeySchema.safeParse(req.nextUrl.searchParams.get("listKey"));
  if (!parsed.success) return await apiError("apiErrors.invalidListKey", 400);

  const rows = await prisma.userListOrder.findMany({
    where: { userId: user.id, listKey: parsed.data },
    orderBy: { order: "asc" },
    select: { itemKey: true },
  });
  return NextResponse.json({ order: rows.map((r) => r.itemKey) });
}

const putSchema = z.object({
  listKey: listKeySchema,
  itemKeys: z.array(z.string()).min(1),
});

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const { listKey, itemKeys } = parsed.data;
  await prisma.$transaction([
    prisma.userListOrder.deleteMany({ where: { userId: user.id, listKey } }),
    prisma.userListOrder.createMany({
      data: itemKeys.map((itemKey, order) => ({ userId: user.id, listKey, itemKey, order })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
