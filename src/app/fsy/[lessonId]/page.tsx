import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import FsyLessonView from "@/components/FsyLessonView";
import type { FsyContentBlock } from "@/lib/fsyContent";
import { isContentCollectionSelectable } from "@/lib/contentCollections";
import { getT } from "@/lib/i18n";

export default async function FsyLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { lessonId } = await params;
  const lesson = await prisma.fsyLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      year: true,
      month: true,
      category: true,
      publishedTitle: true,
      publishedContent: true,
      sourceUrl: true,
      status: true,
      contentCollectionId: true,
    },
  });

  if (!lesson || !lesson.publishedContent) notFound();
  if (!(await isContentCollectionSelectable(lesson.contentCollectionId, user.isAdmin))) notFound();

  return (
    <FsyLessonView
      title={lesson.publishedTitle ?? getT(user.uiLanguage)("courseNames.fsy")}
      month={lesson.month}
      year={lesson.year}
      category={lesson.category}
      blocks={JSON.parse(lesson.publishedContent) as FsyContentBlock[]}
      sourceUrl={lesson.sourceUrl}
    />
  );
}
