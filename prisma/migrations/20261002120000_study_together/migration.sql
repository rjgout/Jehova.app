-- Samen studeren: nieuwe live-modus, XP-reden en de tabellen voor sessie,
-- ronde en antwoord. Alleen toevoegingen; bestaande gegevens veranderen niet.

-- AlterEnum
ALTER TYPE "LiveGameMode" ADD VALUE 'STUDY';

-- AlterEnum
ALTER TYPE "XPReason" ADD VALUE 'STUDY_TOGETHER';

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "unitKey" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "questions" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

CONSTRAINT "StudyRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "StudyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudySession_gameId_key" ON "StudySession"("gameId");

-- CreateIndex
CREATE INDEX "StudySession_courseId_idx" ON "StudySession"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyRound_sessionId_number_key" ON "StudyRound"("sessionId", "number");

-- CreateIndex
CREATE INDEX "StudyAnswer_userId_idx" ON "StudyAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyAnswer_roundId_userId_index_key" ON "StudyAnswer"("roundId", "userId", "index");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LiveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRound" ADD CONSTRAINT "StudyRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAnswer" ADD CONSTRAINT "StudyAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "StudyRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAnswer" ADD CONSTRAINT "StudyAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
