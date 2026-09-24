import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { advanceCourseProgress, syncCourses } from "@/lib/courses";
import { isContentCollectionSelectable } from "@/lib/contentCollections";
import ChapterListCourseView from "@/components/ChapterListCourseView";
import PodcastCourseView from "@/components/PodcastCourseView";
import KidsCourseView from "@/components/KidsCourseView";
import IntroCourseView from "@/components/IntroCourseView";
import FsyCourseView from "@/components/FsyCourseView";
import ReadingCourseView from "@/components/ReadingCourseView";
import { chapterTerm } from "@/lib/chapterTerm";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.emailVerifiedAt && (await isEmailConfigured())) {
    redirect("/verify-email");
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          chapter: {
            include: {
              book: true,
              verses: { select: { text: true } },
              _count: { select: { verses: true, exercises: true } },
              progress: { where: { userId: user.id } },
            },
          },
        },
      },
    },
  });
  if (!course) redirect("/courses");
  if (!(await isContentCollectionSelectable(course.contentCollectionId, user.isAdmin))) redirect("/courses");

  if (course.type === "PODCAST") {
    const [podcast, episodes] = await Promise.all([
      course.podcastId ? prisma.podcast.findUnique({ where: { id: course.podcastId }, select: { name: true } }) : null,
      prisma.podcastEpisode.findMany({
        // Een cursus zonder podcastId bestaat na de migratie niet meer; dan
        // liever geen afleveringen dan die van alle podcasts door elkaar.
        where: { podcastId: course.podcastId ?? "" },
        orderBy: { order: "asc" },
        include: {
          progress: { where: { userId: user.id } },
          exercises: { select: { mode: true } },
          playbackProgress: { where: { userId: user.id }, select: { positionSeconds: true } },
        },
      }),
    ]);

    return (
      <PodcastCourseView
        courseName={course.name}
        podcastName={podcast?.name ?? course.name}
        episodes={episodes.map((episode) => {
          const contentProgress = episode.progress.find((p) => p.mode === "CONTENT");
          const bomProgress = episode.progress.find((p) => p.mode === "BOM_CONNECTION");
          return {
            id: episode.id,
            number: episode.number,
            title: episode.title,
            summary: episode.summary,
            listenUrl: episode.listenUrl,
            audioUrl: episode.audioUrl,
            contentCompleted: contentProgress?.completed ?? false,
            contentBestScore: contentProgress ? contentProgress.bestScore : null,
            hasContentExercises: episode.exercises.some((e) => e.mode === "CONTENT"),
            bomCompleted: bomProgress?.completed ?? false,
            bomBestScore: bomProgress ? bomProgress.bestScore : null,
            hasBomExercises: episode.exercises.some((e) => e.mode === "BOM_CONNECTION"),
            resumeSeconds: episode.playbackProgress[0]?.positionSeconds ?? 0,
          };
        })}
      />
    );
  }

  if (course.type === "KIDS") {
    const stories = await prisma.kidsStory.findMany({
      orderBy: { order: "asc" },
      include: { progress: { where: { userId: user.id } } },
    });

    return (
      <KidsCourseView
        courseName={course.name}
        stories={stories.map((story) => {
          const images = JSON.parse(story.images) as string[];
          return {
            id: story.id,
            number: story.number,
            title: story.title,
            image: images[0] ?? null,
            completed: story.progress[0]?.completed ?? false,
            bestScore: story.progress[0] ? story.progress[0].bestScore : null,
          };
        })}
      />
    );
  }

  if (course.type === "INTRO") {
    const lessons = await prisma.introLesson.findMany({
      orderBy: { number: "asc" },
      include: { progress: { where: { userId: user.id } } },
    });

    return (
      <IntroCourseView
        courseName={course.name}
        lessons={lessons.map((lesson) => ({
          id: lesson.id,
          number: lesson.number,
          title: lesson.title,
          summary: lesson.summary,
          completed: lesson.progress[0]?.completed ?? false,
          bestScore: lesson.progress[0] ? lesson.progress[0].bestScore : null,
        }))}
      />
    );
  }

  if (course.type === "FSY") {
    const lessons = await prisma.fsyLesson.findMany({
      where: { contentCollectionId: course.contentCollectionId, publishedContent: { not: null } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { order: "desc" }],
    });

    return (
      <FsyCourseView
        courseName={course.name}
        lessons={lessons.map((lesson) => {
          const images = JSON.parse(lesson.publishedImages ?? "[]") as { url: string; alt: string }[];
          return {
            id: lesson.id,
            year: lesson.year,
            month: lesson.month,
            category: lesson.category,
            title: lesson.publishedTitle ?? lesson.title,
            image: images[0]?.url ?? null,
          };
        })}
      />
    );
  }

  if (course.type === "READING_LESSONS") {
    let lessons = await prisma.courseLesson.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      include: {
        chapter: { include: { book: true } },
        progress: { where: { userId: user.id } },
      },
    });

    // Bestaande installaties krijgen de nieuwe cursus al via de migratie.
    // De vaste lesindeling wordt één keer opgebouwd zodra de cursus voor het
    // eerst wordt geopend; daarna blijven de grenzen en voortgang bewaard.
    if (lessons.length === 0 && (await prisma.chapter.count()) > 0) {
      await syncCourses(prisma);
      lessons = await prisma.courseLesson.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        include: {
          chapter: { include: { book: true } },
          progress: { where: { userId: user.id } },
        },
      });
    }

    let courseProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (!courseProgress) {
      await advanceCourseProgress(prisma, user.id, course.id);
      courseProgress = await prisma.userCourseProgress.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
    } else if (courseProgress.currentLessonId === null && lessons.length > 0) {
      const completedCount = await prisma.userCourseLessonProgress.count({
        where: { userId: user.id, lesson: { courseId: course.id }, completed: true },
      });
      if (completedCount === 0) {
        await advanceCourseProgress(prisma, user.id, course.id);
        courseProgress = await prisma.userCourseProgress.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
        });
      }
    }

    const currentLesson = courseProgress?.currentLessonId
      ? lessons.find((lesson) => lesson.id === courseProgress.currentLessonId) ?? null
      : null;
    const currentOrder = currentLesson?.order ?? null;
    const currentChapterFirstLessonOrder = currentLesson
      ? lessons.find((lesson) => lesson.chapterId === currentLesson.chapterId)?.order ?? currentLesson.order
      : 0;

    const chapterMap = new Map<string, {
      id: string;
      number: number;
      bookName: string;
      lessonCount: number;
      completedLessons: number;
      firstOrder: number;
    }>();

    for (const lesson of lessons) {
      const existing = chapterMap.get(lesson.chapterId);
      const completed = lesson.progress[0]?.completed ?? false;
      if (existing) {
        existing.lessonCount++;
        if (completed) existing.completedLessons++;
      } else {
        chapterMap.set(lesson.chapterId, {
          id: lesson.chapterId,
          number: lesson.chapter.number,
          bookName: lesson.chapter.book.name,
          lessonCount: 1,
          completedLessons: completed ? 1 : 0,
          firstOrder: lesson.order,
        });
      }
    }

    return (
      <ReadingCourseView
        courseId={course.id}
        courseName={course.name}
        unitPlural={chapterTerm(null, course.contentCollectionId).plural}
        today={
          currentLesson
            ? {
                id: currentLesson.id,
                bookName: currentLesson.chapter.book.name,
                chapterNumber: currentLesson.chapter.number,
                lessonNumber: currentLesson.order - currentChapterFirstLessonOrder + 1,
                startVerse: currentLesson.startVerse,
                endVerse: currentLesson.endVerse,
              }
            : null
        }
        chapters={Array.from(chapterMap.values()).map((chapter) => ({
          id: chapter.id,
          number: chapter.number,
          bookName: chapter.bookName,
          lessonCount: chapter.lessonCount,
          completedLessons: chapter.completedLessons,
          locked: currentOrder !== null ? chapter.firstOrder > currentOrder : false,
        }))}
      />
    );
  }

  // De resterende cursustypes (van voor naar achter, vrije keuze) zijn
  // allebei simpelweg "een lijst hoofdstukken" (zie
  // ChapterListCourseView) — elk met hun eigen pagina, hun eigen "Vandaag"-
  // hoofdstuk en (bij meerdere boeken) hun eigen inklapbare secties, ook al
  // deelt een los hoofdstuk zijn afrondingsstatus (ChapterProgress) altijd
  // met elke andere cursus die het ook bevat — dat is bewust zo.
  let courseProgress = await prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!courseProgress) {
    await advanceCourseProgress(prisma, user.id, course.id);
    courseProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
  }

  const chapters = course.chapters.map((cc) => cc.chapter);

  return (
    <ChapterListCourseView
      courseName={course.name}
      currentChapterId={courseProgress?.currentChapterId ?? null}
      sequential={course.type !== "FREE_CHOICE"}
      unitPlural={chapterTerm(chapters[0]?.book.slug).plural}
      chapters={chapters.map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        bookName: chapter.book.name,
        verseCount: chapter._count.verses,
        exerciseCount: chapter._count.exercises,
        wordCount: chapter.verses.reduce((sum, v) => sum + v.text.split(/\s+/).length, 0),
        completed: chapter.progress[0]?.completed ?? false,
        bestScore: chapter.progress[0]?.bestScore ?? null,
      }))}
    />
  );
}
