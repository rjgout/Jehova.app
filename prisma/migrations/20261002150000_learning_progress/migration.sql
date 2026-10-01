-- Leervoortgang per inhoud (zie docs/LEERVOORTGANG.md): lezen en oefenen
-- los van elkaar, gedeeld over leesroutes en taaleditie heen.

-- CreateEnum
CREATE TYPE "ContentReadStatus" AS ENUM ('READING', 'READ');

-- CreateTable
CREATE TABLE "ContentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "lastChapterId" TEXT,
    "readStatus" "ContentReadStatus",
    "readVerse" INTEGER NOT NULL DEFAULT 0,
    "readStartedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "exerciseAnswered" INTEGER NOT NULL DEFAULT 0,
    "exercisesCompletedAt" TIMESTAMP(3),
    "rewardCorrect" INTEGER NOT NULL DEFAULT 0,
    "rewardBonusAt" TIMESTAMP(3),
    "baseXpEarned" INTEGER NOT NULL DEFAULT 0,
    "legacyXp" INTEGER NOT NULL DEFAULT 0,
    "legacyCompleted" BOOLEAN NOT NULL DEFAULT false,
    "legacyScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentExerciseCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentExerciseCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "exerciseIds" TEXT NOT NULL,
    "courseLessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "ExerciseSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentProgress_userId_contentKey_key" ON "ContentProgress"("userId", "contentKey");

-- CreateIndex
CREATE INDEX "ContentExerciseCredit_userId_contentKey_idx" ON "ContentExerciseCredit"("userId", "contentKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContentExerciseCredit_userId_exerciseId_key" ON "ContentExerciseCredit"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseSession_userId_createdAt_idx" ON "ExerciseSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentExerciseCredit" ADD CONSTRAINT "ContentExerciseCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentExerciseCredit" ADD CONSTRAINT "ContentExerciseCredit_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_courseLessonId_fkey" FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: bestaande voortgang overzetten, zodat niemand leesvoortgang,
-- afgeronde hoofdstukken of prestaties kwijtraakt en niemand dezelfde
-- basis-XP twee keer kan verdienen. XP, reeksen en prestaties zelf blijven
-- ongemoeid. De inhoudssleutel is die van contentKeyForChapter
-- (src/lib/learning/contentIdentity.ts): Book.key + '#' + hoofdstuknummer,
-- of 'chapter:' + id zonder Book.key.
--
-- - ChapterProgress (oude hoofdstukvoortgang, gedeeld door Vrije keuze,
--   Hoofdstuk voor hoofdstuk en live-quizzen): afgerond = gelezen en
--   oefenset gemaakt; de XP van toen telt als al uitbetaald (legacyXp).
-- - Afgeronde stappen van Stap voor stap: gelezen tot het laatste vers van
--   de stap, de vragen van die stappen als gemaakt, hun XP als uitbetaald.
-- - Leessessies: het hoofdstuk is bezig.
--
-- Idempotent: ON CONFLICT DO NOTHING, dus nooit een tweede rij per
-- gebruiker en inhoud, en een bestaande rij wordt nooit overschreven.
WITH sources AS (
    SELECT cp."userId",
           CASE WHEN b."key" IS NOT NULL THEN b."key" || '#' || c."number" ELSE 'chapter:' || c."id" END AS "contentKey",
           cp."chapterId",
           cp."completed" AS completed,
           cp."bestScore" AS best_score,
           cp."xpEarned" AS xp,
           0 AS answered,
           0 AS read_verse,
           cp."completedAt" AS at
    FROM "ChapterProgress" cp
    JOIN "Chapter" c ON c."id" = cp."chapterId"
    JOIN "Book" b ON b."id" = c."bookId"
  UNION ALL
    SELECT p."userId",
           CASE WHEN b."key" IS NOT NULL THEN b."key" || '#' || c."number" ELSE 'chapter:' || c."id" END,
           l."chapterId",
           false,
           NULL,
           p."xpEarned",
           LEAST(3, (SELECT COUNT(*) FROM "CourseLessonExercise" x WHERE x."lessonId" = l."id"))::int,
           l."endVerse",
           p."completedAt"
    FROM "UserCourseLessonProgress" p
    JOIN "CourseLesson" l ON l."id" = p."lessonId"
    JOIN "Chapter" c ON c."id" = l."chapterId"
    JOIN "Book" b ON b."id" = c."bookId"
    WHERE p."completed" = true
  UNION ALL
    SELECT rs."userId",
           CASE WHEN b."key" IS NOT NULL THEN b."key" || '#' || c."number" ELSE 'chapter:' || c."id" END,
           rs."chapterId",
           false,
           NULL,
           0,
           0,
           0,
           rs."startedAt"
    FROM "ReadingSession" rs
    JOIN "Chapter" c ON c."id" = rs."chapterId"
    JOIN "Book" b ON b."id" = c."bookId"
)
INSERT INTO "ContentProgress" (
    "id", "userId", "contentKey", "lastChapterId",
    "readStatus", "readVerse", "readStartedAt", "readAt",
    "exerciseAnswered", "exercisesCompletedAt", "rewardBonusAt",
    "legacyXp", "legacyCompleted", "legacyScore",
    "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text,
       s."userId",
       s."contentKey",
       MAX(s."chapterId"),
       CASE WHEN BOOL_OR(s.completed) THEN 'READ'::"ContentReadStatus" ELSE 'READING'::"ContentReadStatus" END,
       MAX(s.read_verse),
       MIN(s.at),
       CASE WHEN BOOL_OR(s.completed) THEN COALESCE(MIN(s.at) FILTER (WHERE s.completed), now()) END,
       SUM(s.answered),
       CASE WHEN BOOL_OR(s.completed) THEN COALESCE(MIN(s.at) FILTER (WHERE s.completed), now()) END,
       CASE WHEN BOOL_OR(s.completed AND s.best_score >= 100) THEN COALESCE(MIN(s.at) FILTER (WHERE s.completed), now()) END,
       SUM(s.xp),
       BOOL_OR(s.completed),
       MAX(s.best_score),
       now(),
       now()
FROM sources s
GROUP BY s."userId", s."contentKey"
ON CONFLICT ("userId", "contentKey") DO NOTHING;
