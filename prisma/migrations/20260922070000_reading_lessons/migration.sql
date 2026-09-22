-- Kleine, vaste leeslessen voor de cursus "Lezen van voor naar achter".
ALTER TYPE "CourseType" ADD VALUE 'READING_LESSONS';

ALTER TABLE "UserCourseProgress"
ADD COLUMN "currentLessonId" TEXT,
ADD COLUMN "comboCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "comboLastCompletedAt" TIMESTAMP(3);

CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "startVerse" INTEGER NOT NULL,
  "endVerse" INTEGER NOT NULL,
  CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLessonExercise" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "CourseLessonExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCourseLessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "UserCourseLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseLesson_courseId_order_key"
ON "CourseLesson"("courseId", "order");

CREATE UNIQUE INDEX "CourseLesson_courseId_chapterId_startVerse_key"
ON "CourseLesson"("courseId", "chapterId", "startVerse");

CREATE INDEX "CourseLesson_courseId_chapterId_idx"
ON "CourseLesson"("courseId", "chapterId");

CREATE UNIQUE INDEX "CourseLessonExercise_lessonId_exerciseId_key"
ON "CourseLessonExercise"("lessonId", "exerciseId");

CREATE UNIQUE INDEX "CourseLessonExercise_lessonId_order_key"
ON "CourseLessonExercise"("lessonId", "order");

CREATE UNIQUE INDEX "UserCourseLessonProgress_userId_lessonId_key"
ON "UserCourseLessonProgress"("userId", "lessonId");

CREATE INDEX "UserCourseLessonProgress_userId_completedAt_idx"
ON "UserCourseLessonProgress"("userId", "completedAt");

ALTER TABLE "UserCourseProgress"
ADD CONSTRAINT "UserCourseProgress_currentLessonId_fkey"
FOREIGN KEY ("currentLessonId") REFERENCES "CourseLesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CourseLesson"
ADD CONSTRAINT "CourseLesson_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseLesson"
ADD CONSTRAINT "CourseLesson_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseLessonExercise"
ADD CONSTRAINT "CourseLessonExercise_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseLessonExercise"
ADD CONSTRAINT "CourseLessonExercise_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCourseLessonProgress"
ADD CONSTRAINT "UserCourseLessonProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCourseLessonProgress"
ADD CONSTRAINT "UserCourseLessonProgress_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
