import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getContentContext } from "@/lib/contentCollections";
import { chapterTerm } from "@/lib/chapterTerm";

// Cursussen die nog NIET in de persoonlijke lijst staan — voor de "Voeg
// nieuwe cursus toe"-catalogus op /courses (en /courses/per-boek, dat dit
// filtert op BY_BOOK). Een door een admin uitgezette cursus (enabled=false)
// verschijnt hier niet, ongeacht abonneestatus.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const contentContext = await getContentContext(user.id);

  const [courses, subscriptions] = await Promise.all([
    prisma.course.findMany({
      where: { enabled: true, contentCollectionId: contentContext.active.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { chapters: true } }, book: { select: { slug: true } } },
    }),
    prisma.userCourseProgress.findMany({
      where: { userId: user.id, subscribed: true },
      select: { courseId: true },
    }),
  ]);

  const subscribedIds = new Set(subscriptions.map((s) => s.courseId));
  const available = courses.filter((c) => !subscribedIds.has(c.id));

  return NextResponse.json({
    courses: available.map((c) => ({
      id: c.id,
      slug: c.slug,
      type: c.type,
      name: c.name,
      description: c.description,
      totalChapters: c._count.chapters,
      unitPlural: chapterTerm(c.book?.slug, c.contentCollectionId).plural,
    })),
  });
}
