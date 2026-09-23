import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { kidsStory } from "@/lib/alleskenner/pool";
import { parseItem, referencedVerses, validateAlleskennerItem } from "@/lib/alleskenner/validate";
import { parsePassage } from "@/lib/alleskenner/content";
import { alleskennerItems } from "../../../../../../prisma/alleskennerContent";
import { generatedAlleskennerItems } from "../../../../../../prisma/alleskennerGenerated";

const schema = z.union([
  z.object({ reset: z.literal(true) }),
  z.object({ enabled: z.boolean() }),
  z.object({ data: z.record(z.string(), z.unknown()) }),
]);

async function verseMap(refs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const ref of new Set(refs)) {
    const range = parsePassage(ref);
    if (!range || range.from !== range.to) continue;
    const verse = await prisma.verse.findFirst({
      where: { number: range.from, chapter: { number: range.chapter, book: { name: range.book } } },
      select: { text: true },
    });
    if (verse) map.set(ref, verse.text);
  }
  return map;
}

// Bestaand onderdeel aanpassen: in-/uitschakelen, corrigeren (zelfde controle
// als npm run alleskenner:check, tegen de verzen in de database) of
// terugzetten naar de versie uit prisma/alleskennerContent.ts. Een correctie
// zet editedByAdmin, zodat een volgende import hem niet overschrijft.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.alleskennerItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Onderdeel niet gevonden." }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });
  const body = parsed.data;

  if ("enabled" in body) {
    await prisma.alleskennerItem.update({ where: { id }, data: { enabled: body.enabled } });
    return NextResponse.json({ ok: true });
  }

  if ("reset" in body) {
    const original = [...alleskennerItems, ...generatedAlleskennerItems()].find((i) => i.id === id);
    if (!original) return NextResponse.json({ error: "Dit onderdeel staat niet (meer) in het inhoudsbestand." }, { status: 409 });
    await prisma.alleskennerItem.update({ where: { id }, data: { data: JSON.stringify(original.data), editedByAdmin: false } });
    return NextResponse.json({ ok: true });
  }

  const item = parseItem(id, existing.kind, body.data);
  if (typeof item === "string") return NextResponse.json({ error: item }, { status: 400 });
  const verses = await verseMap(referencedVerses(item));
  const errors = validateAlleskennerItem(item, { verseText: (ref) => verses.get(ref) ?? null, kidsStory });
  if (errors.length > 0) return NextResponse.json({ error: "Niet opgeslagen.", errors }, { status: 400 });

  await prisma.alleskennerItem.update({ where: { id }, data: { data: JSON.stringify(item.data), editedByAdmin: true } });
  return NextResponse.json({ ok: true });
}
