-- Indexen op verwijzende kolommen rond boeken, hoofdstukken, verzen en
-- oefeningen. Zonder deze indexen moest Postgres bij elk verwijderd vers of
-- elke verwijderde oefening (content opnieuw laden) de verwijzende tabellen
-- volledig doorzoeken; met veel gebruikersdata (ExerciseAttempt) werd de seed
-- daardoor extreem traag. Alleen indexen: geen gedrag of data verandert.

-- CreateIndex
CREATE INDEX "Exercise_chapterId_idx" ON "Exercise"("chapterId");

-- CreateIndex
CREATE INDEX "Exercise_sourceVerseId_idx" ON "Exercise"("sourceVerseId");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_exerciseId_idx" ON "ExerciseAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX "ChapterProgress_chapterId_idx" ON "ChapterProgress"("chapterId");

-- CreateIndex
CREATE INDEX "LiveGame_chapterId_idx" ON "LiveGame"("chapterId");

-- CreateIndex
CREATE INDEX "Bookmark_verseId_idx" ON "Bookmark"("verseId");

-- CreateIndex
CREATE INDEX "Highlight_verseId_idx" ON "Highlight"("verseId");

-- CreateIndex
CREATE INDEX "Note_verseId_idx" ON "Note"("verseId");

-- CreateIndex
CREATE INDEX "ReadingSession_chapterId_idx" ON "ReadingSession"("chapterId");

-- CreateIndex
CREATE INDEX "QuestionOption_exerciseId_idx" ON "QuestionOption"("exerciseId");

-- CreateIndex
CREATE INDEX "CourseChapter_chapterId_idx" ON "CourseChapter"("chapterId");

-- CreateIndex
CREATE INDEX "UserCourseProgress_currentChapterId_idx" ON "UserCourseProgress"("currentChapterId");

-- CreateIndex
CREATE INDEX "Challenge_chapterId_idx" ON "Challenge"("chapterId");

-- CreateIndex
CREATE INDEX "CourseLesson_chapterId_idx" ON "CourseLesson"("chapterId");

-- CreateIndex
CREATE INDEX "CourseLessonExercise_exerciseId_idx" ON "CourseLessonExercise"("exerciseId");
