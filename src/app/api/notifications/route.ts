import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const MAX_LISTED = 100;

// Meldingencentrum (de bel in de header, zie NotificationCenter.tsx).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const [notifications, count] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_LISTED,
      select: { id: true, kind: true, title: true, body: true, url: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ notifications, count }, { headers: { "Cache-Control": "private, no-store" } });
}

// Wissen: losse meldingen (ids), een hele groep (kind), alles met een link
// (url, bv. na het openen van een uitnodiging via de melding bovenin), of alles.
const deleteSchema = z.union([
  z.object({ ids: z.array(z.string().max(64)).min(1).max(MAX_LISTED) }),
  z.object({ kind: z.string().max(32) }),
  z.object({ url: z.string().max(300) }),
  z.object({ all: z.literal(true) }),
]);

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  const body = parsed.data;
  const where =
    "ids" in body
      ? { userId: user.id, id: { in: body.ids } }
      : "kind" in body
        ? { userId: user.id, kind: body.kind }
        : "url" in body
          ? { userId: user.id, url: body.url }
          : { userId: user.id };
  await prisma.notification.deleteMany({ where });
  const count = await prisma.notification.count({ where: { userId: user.id } });
  return NextResponse.json({ count });
}
