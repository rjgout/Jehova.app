import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { advanceCourseProgress } from "@/lib/courses";
import ChapterListCourseView from "@/components/ChapterListCourseView";
import PodcastCourseView from "@/components/PodcastCourseView";
import KidsCourseView from "@/components/KidsCourseView";
import IntroCourseView from "@/components/IntroCourseView";
import ReadingCourseView from "@/components/ReadingCourseView";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.emailVerifiedAt && !user.isDemoSeed && (await isEmailConfigured())) {
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

  if (course.type === "PODCAST") {
    const episodes = await prisma.podcastEpisode.findMany({
      orderBy: { order: "asc" },
      include: {
        progress: { where: { userId: user.id } },
        exercises: { select: { mode: true } },
        playbackProgress: { where: { userId: user.id }, select: { positionSeconds: true } },
      },
    });

    return (
      <PodcastCourseView
        courseName={course.name}
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

  if (course.type === "READING_LESSONS") {
    const lessons = await prisma.courseLesson.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      include: {
        chapter: { include: { book: true } },
        progress: { where: { userId: user.id } },
      },
    });

    let courseProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (!courseProgress) {
      await advanceCourseProgress(prisma, user.id, course.id);
      courseProgress = await prisma.userCourseProgress.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
    }

    const currentLesson = courseProgress?.currentLessonId
      ? lessons.find((lesson) => lesson.id === courseProgress.currentLessonId) ?? null
      : null;
    const currentOrder = currentLesson?.order ?? null;

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
        today={
          currentLesson
            ? {
                id: currentLesson.id,
                bookName: currentLesson.chapter.book.name,
                chapterNumber: currentLesson.chapter.number,
                lessonNumber: currentLesson.order + 1,
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

  // De resterende cursustypes (van voor naar achter, vrije keuze, elke
  // per-boek-cursus) zijn alledrie simpelweg "een lijst hoofdstukken" (zie
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
