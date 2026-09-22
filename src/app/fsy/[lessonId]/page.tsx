import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import FsyLessonView from "@/components/FsyLessonView";
import type { FsyContentBlock } from "@/lib/fsyContent";

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
    },
  });

  if (!lesson || lesson.status !== "PUBLISHED" || !lesson.publishedContent) notFound();

  return (
    <FsyLessonView
      title={lesson.publishedTitle ?? "Voor de kracht van de jeugd"}
      month={lesson.month}
      year={lesson.year}
      category={lesson.category}
      blocks={JSON.parse(lesson.publishedContent) as FsyContentBlock[]}
      sourceUrl={lesson.sourceUrl}
    />
  );
}
