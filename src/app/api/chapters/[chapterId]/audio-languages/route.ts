import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { playableAudioUrl } from "@/lib/audioMirror";
import { LANGUAGES } from "@/lib/languages";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  const parsed = z.object({ chapterId: z.string().min(1).max(200) }).safeParse(await params);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig hoofdstuk." }, { status: 400 });

  const selectable = { enabled: true, ...(user.isAdmin ? {} : { visibleToUsers: true }) };
  const chapter = await prisma.chapter.findFirst({
    where: { id: parsed.data.chapterId, book: { contentCollection: selectable } },
    include: { book: { include: { contentCollection: true } } },
  });
  if (!chapter) return NextResponse.json({ error: "Hoofdstuk niet gevonden." }, { status: 404 });
  const { key, contentCollection } = chapter.book;
  if (!key || !contentCollection.work) return NextResponse.json({ editions: [] });

  // Dezelfde verwijzing in de andere uitgave; nooit een andere taal laten
  // voorlezen met de tekst of tijdstippen van de zichtbare uitgave.
  const chapters = await prisma.chapter.findMany({
    where: {
      number: chapter.number,
      book: { key, contentCollection: { ...selectable, work: contentCollection.work } },
    },
    select: {
      audioUrl: true,
      book: { select: { contentCollection: { select: { language: true } } } },
      verses: { orderBy: { number: "asc" }, select: { number: true, text: true, audioStart: true } },
    },
  });
  return NextResponse.json({
    editions: LANGUAGES.flatMap(({ code }) => {
      const edition = chapters.find((item) => item.book.contentCollection.language === code);
      return edition?.verses.length ? [{ language: code, url: playableAudioUrl(edition.audioUrl), verses: edition.verses }] : [];
    }),
  });
}
