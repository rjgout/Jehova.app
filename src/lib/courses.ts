import type { PrismaClient } from "@prisma/client";

export const FRONT_TO_BACK_SLUG = "voor-naar-achter";
export const FREE_CHOICE_SLUG = "vrije-keuze";
export const PODCAST_SLUG = "podcast";
export const KIDS_SLUG = "kinderen";
export const INTRO_SLUG = "ontdek-boek-van-mormon";
export const READING_LESSONS_SLUG = "lezen-van-voor-naar-achter";
export const FSY_SLUG = "voor-de-kracht-van-de-jeugd";


/** Verdeelt een hoofdstuk in zo gelijk mogelijke stukken van maximaal 10 verzen.
 * Voor hoofdstukken van 5 verzen of meer komt elk stuk daardoor uit op 5-10 verzen.
 * Kleine hoofdstukken blijven één les, zodat we nooit kunstmatig een mini-les maken.
 */
export function splitVerseRange(totalVerses: number): { startVerse: number; endVerse: number }[] {
  if (totalVerses <= 0) return [];
  const lessonCount = Math.max(1, Math.ceil(totalVerses / 10));
  const baseSize = Math.floor(totalVerses / lessonCount);
  const remainder = totalVerses % lessonCount;
  const ranges: { startVerse: number; endVerse: number }[] = [];
  let startVerse = 1;
  for (let i = 0; i < lessonCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    ranges.push({ startVerse, endVerse: startVerse + size - 1 });
    startVerse += size;
  }
  return ranges;
}

async function syncReadingLessons(
  db: PrismaClient,
  courseId: string,
  books: { chapters: { id: string; number: number; order: number; bookId: string }[] }[]
): Promise<void> {
  const chapters = books.flatMap((book) => book.chapters);
  const chapterIds = chapters.map((chapter) => chapter.id);
  const exercises = chapterIds.length === 0
    ? []
    : await db.exercise.findMany({
        where: { chapterId: { in: chapterIds }, status: "APPROVED" },
        orderBy: { order: "asc" },
        select: { id: true, chapterId: true, sourceVerse: { select: { number: true } } },
      });

  const exercisesByChapter = new Map<string, { id: string; verseNumber: number | null }[]>();
  for (const exercise of exercises) {
    const list = exercisesByChapter.get(exercise.chapterId) ?? [];
    list.push({ id: exercise.id, verseNumber: exercise.sourceVerse?.number ?? null });
    exercisesByChapter.set(exercise.chapterId, list);
  }

  const expectedLessonIds: string[] = [];
  let lessonOrder = 0;

  for (const chapter of chapters) {
    const verseCount = await db.verse.count({ where: { chapterId: chapter.id } });
    const ranges = splitVerseRange(verseCount);
    const chapterExercises = exercisesByChapter.get(chapter.id) ?? [];

    for (const range of ranges) {
      const lesson = await db.courseLesson.upsert({
        where: {
          courseId_chapterId_startVerse: {
            courseId,
            chapterId: chapter.id,
            startVerse: range.startVerse,
          },
        },
        update: { order: lessonOrder, endVerse: range.endVerse },
        create: {
          courseId,
          chapterId: chapter.id,
          order: lessonOrder,
          startVerse: range.startVerse,
          endVerse: range.endVerse,
        },
      });
      expectedLessonIds.push(lesson.id);
      lessonOrder++;

      await db.courseLessonExercise.deleteMany({ where: { lessonId: lesson.id } });

      const inRange = chapterExercises.filter(
        (exercise) => exercise.verseNumber !== null && exercise.verseNumber >= range.startVerse && exercise.verseNumber <= range.endVerse
      );
      if (inRange.length > 0) {
        await db.courseLessonExercise.createMany({
          data: inRange.map((exercise, index) => ({ lessonId: lesson.id, exerciseId: exercise.id, order: index })),
        });
      }
    }
  }

  await db.courseLesson.deleteMany({
    where: { courseId, id: { notIn: expectedLessonIds.length > 0 ? expectedLessonIds : ["__geen_lessens__"] } },
  });
}

/**
 * Bouwt de structurele cursussen (van-voor-naar-achter, vrije keuze, en één
 * per boek) opnieuw op vanuit de huidige boeken/hoofdstukken. Bewust
 * idempotent: opnieuw draaien na een content-import zet alles weer in sync.
 * Gebruikersvoortgang (UserCourseProgress) blijft intact, want Chapter-ID's
 * blijven stabiel over een re-import heen — alleen de CourseChapter-
 * koppelrijen worden hier weggegooid en herbouwd.
 *
 * Let op voor later: "van voor naar achter" en "vrije keuze" spannen hier
 * bewust over ALLE Book-rijen heen, in `order` — correct zolang er maar één
 * schriftwerk (nu: het Boek van Mormon) in de database staat. Komt er ooit
 * een tweede schriftwerk bij (bv. de Leer en Verbonden, als eigen Book-rijen
 * of via een nieuw "collectie"-veld op Book), dan moet deze functie die twee
 * cursussen per schriftwerk gaan bouwen in plaats van over alles heen —
 * anders vloeien ze door elkaar in één opeenvolging. Book/Chapter/Verse en
 * de Course-typen zelf hebben daar geen wijziging voor nodig, alleen deze
 * functie.
 */
export async function syncCourses(db: PrismaClient): Promise<void> {
  const defaultCollection = await db.contentCollection.findFirst({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (!defaultCollection) throw new Error("Geen contentcollectie beschikbaar.");

  const books = await db.book.findMany({
    where: { contentCollectionId: defaultCollection.id },
    orderBy: { order: "asc" },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  // Negatieve order (i.p.v. de andere cursussen te moeten opschuiven) zodat
  // deze cursus standaard bovenaan staat — passend bij "voor wie nog geen
  // voorkennis heeft". Singleton, net als PODCAST/KIDS: geen CourseChapter-
  // rijen, alle IntroLesson-rijen (zie prisma/importIntro.ts) horen er
  // impliciet allemaal bij.
  await db.course.upsert({
    where: { slug: INTRO_SLUG },
    update: { name: "Ontdek het Boek van Mormon", order: -1, contentCollectionId: defaultCollection.id },
    create: {
      slug: INTRO_SLUG,
      type: "INTRO",
      name: "Ontdek het Boek van Mormon",
      description: "Een korte introductiecursus voor wie nog nooit het Boek van Mormon heeft gelezen.",
      order: -1,
      contentCollectionId: defaultCollection.id,
    },
  });

  const freeChoice = await db.course.upsert({
    where: { slug: FREE_CHOICE_SLUG },
    update: { name: "Vrije keuze", order: 0, contentCollectionId: defaultCollection.id },
    create: {
      slug: FREE_CHOICE_SLUG,
      type: "FREE_CHOICE",
      name: "Vrije keuze",
      description: "Kies zelf welk hoofdstuk je wil doen, in elke volgorde.",
      order: 0,
      contentCollectionId: defaultCollection.id,
    },
  });
  // Zelfde volledige hoofdstuklijst als "van voor naar achter" (alleen de
  // volgorde van het join-record — ChapterListCourseView vergrendelt bij
  // FREE_CHOICE toch niets, zie sequential daar), zodat deze cursus zijn
  // eigen pagina heeft i.p.v. terug te vallen op de generieke dashboard-
  // weergave.
  await db.courseChapter.deleteMany({ where: { courseId: freeChoice.id } });
  const freeChoiceRows = books.flatMap((book) => book.chapters).map((chapter, order) => ({
    courseId: freeChoice.id,
    chapterId: chapter.id,
    order,
  }));
  if (freeChoiceRows.length > 0) {
    await db.courseChapter.createMany({ data: freeChoiceRows });
  }

  const readingLessons = await db.course.upsert({
    where: { slug: READING_LESSONS_SLUG },
    update: {
      name: "Lezen van voor naar achter",
      description: "Lees het hele Boek van Mormon in kleine, behapbare lessen van ongeveer 5 tot 10 verzen.",
      order: 2,
      contentCollectionId: defaultCollection.id,
    },
    create: {
      slug: READING_LESSONS_SLUG,
      type: "READING_LESSONS",
      name: "Lezen van voor naar achter",
      description: "Lees het hele Boek van Mormon in kleine, behapbare lessen van ongeveer 5 tot 10 verzen.",
      order: 2,
      contentCollectionId: defaultCollection.id,
    },
  });
  await syncReadingLessons(db, readingLessons.id, books);

  const frontToBack = await db.course.upsert({
    where: { slug: FRONT_TO_BACK_SLUG },
    update: { name: "Van voor naar achter", order: 1, contentCollectionId: defaultCollection.id },
    create: {
      slug: FRONT_TO_BACK_SLUG,
      type: "FRONT_TO_BACK",
      name: "Van voor naar achter",
      description: "Eén vaste volgorde door alle boeken heen, hoofdstuk na hoofdstuk.",
      order: 1,
      contentCollectionId: defaultCollection.id,
    },
  });
  await db.courseChapter.deleteMany({ where: { courseId: frontToBack.id } });
  const frontToBackRows = books.flatMap((book) => book.chapters).map((chapter, order) => ({
    courseId: frontToBack.id,
    chapterId: chapter.id,
    order,
  }));
  if (frontToBackRows.length > 0) {
    await db.courseChapter.createMany({ data: frontToBackRows });
  }

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const slug = `boek-${book.slug}`;
    const course = await db.course.upsert({
      where: { slug },
      update: { name: book.name, bookId: book.id, order: 3 + i, contentCollectionId: book.contentCollectionId },
      create: { slug, type: "BY_BOOK", name: book.name, bookId: book.id, order: 3 + i, contentCollectionId: book.contentCollectionId },
    });
    await db.courseChapter.deleteMany({ where: { courseId: course.id } });
    const rows = book.chapters.map((chapter, order) => ({ courseId: course.id, chapterId: chapter.id, order }));
    if (rows.length > 0) {
      await db.courseChapter.createMany({ data: rows });
    }
  }

  // Singleton, net als vrije keuze: geen CourseChapter-rijen — de
  // PodcastEpisode-rijen (zie prisma/importPodcast.ts) horen er impliciet
  // allemaal bij.
  await db.course.upsert({
    where: { slug: PODCAST_SLUG },
    update: { name: "Geloof je dat ook? podcast", order: 3 + books.length, contentCollectionId: defaultCollection.id },
    create: {
      slug: PODCAST_SLUG,
      type: "PODCAST",
      name: "Geloof je dat ook? podcast",
      description: "Elke aflevering: vragen over de aflevering zelf, en de brug naar het Boek van Mormon.",
      order: 2 + books.length,
      contentCollectionId: defaultCollection.id,
    },
  });

  // Singleton, net als PODCAST: geen CourseChapter-rijen, alle KidsStory-
  // rijen (zie prisma/importKids.ts) horen er impliciet allemaal bij.
  await db.course.upsert({
    where: { slug: KIDS_SLUG },
    update: { name: "Verhalen uit het Boek van Mormon (voor kinderen)", order: 4 + books.length, contentCollectionId: defaultCollection.id },
    create: {
      slug: KIDS_SLUG,
      type: "KIDS",
      name: "Verhalen uit het Boek van Mormon (voor kinderen)",
      description: "Korte, geïllustreerde verhalen met een plaatjesspel en simpele vraagjes — leuk voor de kleintjes.",
      order: 3 + books.length,
      contentCollectionId: defaultCollection.id,
    },
  });

  // FSY heeft een eigen contentfamilie en geen CourseChapter-rijen. De
  // cursus wordt alleen aangemaakt als de collectie aanwezig is, zodat een
  // oudere installatie zonder FSY-migratie gewoon blijft werken.
  const fsyCollection = await db.contentCollection.findUnique({
    where: { id: "content_fsy" },
    select: { id: true },
  });
  if (fsyCollection) {
    await db.course.upsert({
      where: { slug: FSY_SLUG },
      update: {
        name: "Voor de kracht van de jeugd",
        description: "Het wekelijkse leerplan met tekst en afbeeldingen uit de officiële bron.",
        order: 0,
        contentCollectionId: fsyCollection.id,
      },
      create: {
        slug: FSY_SLUG,
        type: "FSY",
        name: "Voor de kracht van de jeugd",
        description: "Het wekelijkse leerplan met tekst en afbeeldingen uit de officiële bron.",
        order: 0,
        contentCollectionId: fsyCollection.id,
      },
    });
  }
}

/**
 * Bepaalt en registreert het volgende hoofdstuk in een cursus voor een
 * gebruiker, na het afronden van `completedChapterId` (of bij een eerste
 * bezoek als die nog niet is opgegeven). Voor FREE_CHOICE wordt nooit een
 * "volgende" hoofdstuk vastgelegd — dat blijft altijd de eigen keuze.
 */
export async function advanceCourseProgress(
  db: PrismaClient,
  userId: string,
  courseId: string,
  completedChapterId?: string
): Promise<void> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { chapters: { orderBy: { order: "asc" }, select: { chapterId: true } } },
  });
  if (!course || course.type === "FREE_CHOICE") return;

  if (course.type === "READING_LESSONS") {
    const lessons = await db.courseLesson.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    let nextLessonId: string | null;
    if (completedChapterId) {
      const completedLesson = await db.courseLesson.findFirst({
        where: { courseId, chapterId: completedChapterId },
        orderBy: { order: "asc" },
        select: { order: true },
      });
      if (!completedLesson) return;
      const next = lessons[completedLesson.order + 1];
      nextLessonId = next?.id ?? null;
    } else {
      nextLessonId = lessons[0]?.id ?? null;
    }
    await db.userCourseProgress.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { currentLessonId: nextLessonId, currentChapterId: null, lastActivityAt: new Date() },
      create: { userId, courseId, currentLessonId: nextLessonId },
    });
    return;
  }

  const orderedChapterIds = course.chapters.map((c) => c.chapterId);
  let nextChapterId: string | null;
  if (completedChapterId) {
    const idx = orderedChapterIds.indexOf(completedChapterId);
    if (idx === -1) return; // dit hoofdstuk hoort niet bij deze cursus, niks aanpassen
    nextChapterId = orderedChapterIds[idx + 1] ?? null;
  } else {
    nextChapterId = orderedChapterIds[0] ?? null;
  }

  await db.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { currentChapterId: nextChapterId, lastActivityAt: new Date() },
    create: { userId, courseId, currentChapterId: nextChapterId },
  });
}

/**
 * Voegt een cursus toe aan de persoonlijke cursussenlijst van een gebruiker
 * ("Cursussen"), of herstelt 'm na eerder verwijderen. UserCourseProgress
 * (dus ook currentChapterId, de voortgang) blijft altijd bestaan zodra die
 * ooit is aangemaakt — dit zet alleen `subscribed` aan, nooit uit (zie de
 * unsubscribe-route voor het tegenovergestelde). Bij een cursus die deze
 * gebruiker nog nooit koos, wordt voor niet-FREE_CHOICE-types meteen een
 * eerste hoofdstuk klaargezet (via advanceCourseProgress); FREE_CHOICE
 * heeft daar geen "volgende hoofdstuk"-concept voor, dus krijgt gewoon een
 * kale rij.
 */
export async function subscribeUserToCourse(db: PrismaClient, userId: string, courseId: string): Promise<void> {
  const existing = await db.userCourseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) {
    if (!existing.subscribed) {
      await db.userCourseProgress.update({ where: { userId_courseId: { userId, courseId } }, data: { subscribed: true } });
    }
    return;
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return;
  if (course.type === "FREE_CHOICE") {
    await db.userCourseProgress.create({ data: { userId, courseId } });
  } else {
    await advanceCourseProgress(db, userId, courseId);
  }
}
