import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getContentContext } from "@/lib/contentCollections";
import { apiError } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  // Zoeken binnen de gekozen collectie, net als de hoofdstukkenlijst.
  const contentContext = await getContentContext(user.id);
  const verses = await prisma.verse.findMany({
    where: { text: { contains: q, mode: "insensitive" }, chapter: { book: { contentCollectionId: contentContext.active.id } } },
    include: { chapter: { include: { book: true } } },
    orderBy: [{ chapter: { book: { order: "asc" } } }, { chapter: { order: "asc" } }, { number: "asc" }],
    take: 20,
  });

  return NextResponse.json({
    results: verses.map((v) => ({
      chapterId: v.chapter.id,
      bookName: v.chapter.book.name,
      chapterNumber: v.chapter.number,
      verseNumber: v.number,
      text: v.text,
    })),
  });
}
