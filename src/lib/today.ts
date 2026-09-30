import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { amsterdamNow, dayKey } from "@/lib/dates";
import { getTextOfTheDay, type DailyText } from "@/lib/dailyText";
import { wordGameDayKey } from "@/lib/wordGame";
import { getActiveGameStatus, type ActivityItem } from "@/lib/activeGames";
import { getSubscribedCourseSummaries } from "@/lib/courseSummaries";
import { getContentContext } from "@/lib/contentCollections";
import { getGameSettings } from "@/lib/gameSettings";
import { GAME_CATALOG, isGameVisible, type GameCatalogEntry } from "@/lib/gameCatalog";
import { getFriendStatusMap } from "@/lib/presence";
import { applyPersonalOrder } from "@/lib/listOrder";
import { localizedCourse } from "@/lib/courseText";
import { chapterTerm, localizeTerm } from "@/lib/chapterTerm";
import { getT } from "@/lib/i18n";

// Alle gegevens voor Vandaag (src/app/dashboard/page.tsx), in één keer en
// parallel opgehaald. Elke bron is bestaande functionaliteit: de open
// spellen uit activeGames.ts, de cursusvoortgang uit courseSummaries.ts,
// aanwezigheid via presence.ts (met alle privacyregels), de dagelijkse
// spellen uit hun eigen tabellen. Hier komt niets bij dat een andere pagina
// anders zou laten zien.

export type OpenActionKind = "friend-request" | "invite" | "live-invite" | "turn" | "live" | "solo";

export interface OpenAction {
  key: string;
  kind: OpenActionKind;
  game: ActivityItem["kind"] | null;
  person: { id: string; handle: string } | null;
  /** Waar het over gaat: een hoofdstuk ("Alma 32") of de naam van het spel. */
  subject: string;
  at: string | null;
  href: string;
  friendshipId?: string;
}

export interface ContinueItem {
  key: string;
  kind: "course" | "podcast";
  title: string;
  /** Plek in de inhoud: "Alma 32", "Alma 32:1-10" of de luisterpositie in seconden. */
  position: string | null;
  positionSeconds: number | null;
  progress: { done: number; total: number; unitPlural: string } | null;
  href: string;
  /** Naam van de podcast, of het type cursus (vertaald) voor het label. */
  context: string;
  at: string;
}

export interface DailyGameState {
  href: string;
  status: "todo" | "in-progress" | "done";
  won?: boolean;
}

export interface OnlineFriend {
  id: string;
  handle: string;
  avatarEmoji: string | null;
  activity: string | null;
}

export interface DiscoverItem {
  key: string;
  kind: "course" | "game";
  title: string;
  description: string | null;
  href: string;
  meta: string | null;
  /** Voor spellen: de sleutel in de vertalingen (gamesHub.<textKey>). */
  gameTextKey?: GameCatalogEntry["textKey"];
}

export interface TodayData {
  firstName: string;
  partOfDay: "morning" | "afternoon" | "evening" | "night";
  streak: { current: number; studiedToday: boolean };
  actions: OpenAction[];
  continueItems: ContinueItem[];
  dailyText: DailyText | null;
  wordGame: DailyGameState | null;
  dailyQuiz: DailyGameState | null;
  social: { friendCount: number; online: OnlineFriend[]; viewerSharesOnline: boolean };
  discover: DiscoverItem[];
}

const MAX_ACTIONS = 6;
const MAX_CONTINUE = 8;
const MAX_ONLINE = 6;
const MAX_DISCOVER = 6;

function partOfDay(): TodayData["partOfDay"] {
  const hour = amsterdamNow().hour;
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function byNewest<T extends { at: string | null }>(a: T, b: T): number {
  return (b.at ?? "").localeCompare(a.at ?? "");
}

function openActions(status: Awaited<ReturnType<typeof getActiveGameStatus>>, friendRequests: { id: string; createdAt: Date; sender: { id: string; handle: string } }[]): OpenAction[] {
  const person = (item: ActivityItem) => (item.opponentId && item.opponentName ? { id: item.opponentId, handle: item.opponentName } : null);
  const requests: OpenAction[] = friendRequests.map((request) => ({
    key: `friend-${request.id}`,
    kind: "friend-request",
    game: null,
    person: request.sender,
    subject: "",
    at: request.createdAt.toISOString(),
    href: "/friends",
    friendshipId: request.id,
  }));
  const invites: OpenAction[] = [
    ...status.liveInvitesReceived.map((item) => ({ item, kind: "live-invite" as const })),
    ...status.invitesReceived.map((item) => ({ item, kind: "invite" as const })),
  ]
    .map(({ item, kind }) => ({
      key: `${kind}-${item.kind}-${item.id}`,
      kind,
      game: item.kind,
      person: person(item),
      subject: item.label,
      at: item.at,
      href: item.playLink ?? item.link,
    }))
    .sort(byNewest);
  // Alleen wat op jou wacht: een beurt bij een tegenstander is geen actie.
  const turns: OpenAction[] = status.activeGames
    .filter((item) => item.myTurn === true || item.kind === "live" || item.kind === "chapter-guess-solo")
    .map((item) => ({
      key: `turn-${item.kind}-${item.id}`,
      kind: item.kind === "live" ? ("live" as const) : item.kind === "chapter-guess-solo" ? ("solo" as const) : ("turn" as const),
      game: item.kind,
      person: person(item),
      subject: item.label,
      at: item.at,
      href: item.playLink ?? item.link,
    }))
    .sort(byNewest);
  return [...requests, ...invites, ...turns].slice(0, MAX_ACTIONS);
}

export async function getTodayData(user: User): Promise<TodayData> {
  const t = getT(user.uiLanguage);
  const today = dayKey();
  const contentContext = await getContentContext(user.id);

  const [
    gameStatus,
    friendRequests,
    courses,
    readingPositions,
    podcastPositions,
    dailyText,
    settings,
    wordGame,
    dailyQuiz,
    friendships,
    catalog,
    gameOrder,
  ] = await Promise.all([
    getActiveGameStatus(user),
    prisma.friendship.findMany({
      where: { receiverId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: MAX_ACTIONS,
      select: { id: true, createdAt: true, sender: { select: { id: true, handle: true } } },
    }),
    getSubscribedCourseSummaries(user, contentContext.active.id, t),
    // De kleine leeslessen houden hun plek bij als les, niet als hoofdstuk.
    prisma.userCourseProgress.findMany({
      where: { userId: user.id, subscribed: true, currentLessonId: { not: null } },
      select: {
        courseId: true,
        currentLesson: { select: { startVerse: true, endVerse: true, chapter: { select: { number: true, book: { select: { name: true } } } } } },
      },
    }),
    prisma.podcastPlaybackProgress.findMany({
      where: { userId: user.id, positionSeconds: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        positionSeconds: true,
        updatedAt: true,
        episode: { select: { id: true, number: true, title: true, podcast: { select: { name: true, courses: { select: { id: true }, take: 1 } } } } },
      },
    }),
    getTextOfTheDay(new Date(), user.contentLanguage),
    getGameSettings(),
    prisma.wordGame.findFirst({ where: { userId: user.id, dayKey: wordGameDayKey() }, select: { status: true } }),
    prisma.alleskennerSoloRun.findFirst({ where: { userId: user.id, mode: "DAILY", dayKey: today }, select: { status: true } }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
      select: {
        senderId: true,
        sender: { select: { id: true, handle: true, avatarEmoji: true } },
        receiver: { select: { id: true, handle: true, avatarEmoji: true } },
      },
    }),
    prisma.course.findMany({
      where: { enabled: true, contentCollectionId: contentContext.active.id, userProgress: { none: { userId: user.id, subscribed: true } } },
      orderBy: { order: "asc" },
      take: 4,
      include: { _count: { select: { chapters: true } }, book: { select: { slug: true } }, contentCollection: { select: { work: true } } },
    }),
    prisma.userListOrder.findMany({ where: { userId: user.id, listKey: "games" }, orderBy: { order: "asc" }, select: { itemKey: true } }),
  ]);

  const visibleGame = (id: string) => {
    const game = GAME_CATALOG.find((g) => g.id === id);
    return game && isGameVisible(game, settings, contentContext.gameKeys, user.isAdmin) ? game : null;
  };

  // Ga verder: cursussen waar je al mee bezig bent, en podcasts die je half
  // beluisterd hebt, samen op laatste activiteit.
  const lessonByCourse = new Map(readingPositions.map((p) => [p.courseId, p.currentLesson]));
  const courseItems: ContinueItem[] = courses
    .filter((course) => course.lastActivityAt && (course.completedCount > 0 || course.currentChapter || lessonByCourse.get(course.id)))
    .map((course) => {
      const lesson = lessonByCourse.get(course.id);
      const position = lesson
        ? `${lesson.chapter.book.name} ${lesson.chapter.number}:${lesson.startVerse}-${lesson.endVerse}`
        : course.currentChapter
          ? `${course.currentChapter.bookName} ${course.currentChapter.number}`
          : null;
      return {
        key: `course-${course.id}`,
        kind: "course",
        title: course.name,
        position,
        positionSeconds: null,
        progress: course.totalChapters > 0 ? { done: course.completedCount, total: course.totalChapters, unitPlural: course.unitPlural } : null,
        href: `/courses/${course.id}`,
        context: contentContext.active.name,
        at: course.lastActivityAt!,
      };
    });
  const podcastItems: ContinueItem[] = podcastPositions
    .filter((p) => p.episode.podcast.courses[0])
    .map((p) => ({
      key: `podcast-${p.episode.id}`,
      kind: "podcast",
      title: t("player.episode", { n: p.episode.number, title: p.episode.title }),
      position: null,
      positionSeconds: Math.round(p.positionSeconds),
      progress: null,
      href: `/courses/${p.episode.podcast.courses[0].id}`,
      context: p.episode.podcast.name,
      at: p.updatedAt.toISOString(),
    }));
  const continueItems = [...courseItems, ...podcastItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_CONTINUE);

  const wordGameEntry = visibleGame("word-game");
  const quizEntry = visibleGame("alleskenner");

  // Aanwezigheid alleen via presence.ts: dat past incognito, "online-status
  // delen" en "activiteit delen" toe, en toont niets als je je eigen status
  // niet deelt (zelfde regel als de vriendenpagina).
  const friends = friendships.map((f) => (f.senderId === user.id ? f.receiver : f.sender));
  const statusMap = await getFriendStatusMap(friends.map((f) => f.id), user.shareOnlineStatus);
  const online: OnlineFriend[] = friends
    .filter((f) => statusMap[f.id]?.online)
    .slice(0, MAX_ONLINE)
    .map((f) => ({ id: f.id, handle: f.handle, avatarEmoji: f.avatarEmoji, activity: statusMap[f.id]?.activity?.label ?? null }));

  // Voor jou: nog niet toegevoegde cursussen bij de actieve content en de
  // spellen in je eigen volgorde. De dagelijkse spellen staan al bij Vandaag.
  const games = applyPersonalOrder(
    GAME_CATALOG.filter((g) => !["word-game", "alleskenner"].includes(g.id) && visibleGame(g.id)),
    gameOrder.map((o) => o.itemKey)
  ).slice(0, MAX_DISCOVER);
  const courseCards: DiscoverItem[] = catalog.map((course) => {
      const text = localizedCourse({ ...course, work: course.contentCollection.work }, user.uiLanguage);
      const unit = localizeTerm(chapterTerm(course.book?.slug, course.contentCollectionId), t).plural;
      return {
        key: `course-${course.id}`,
        kind: "course" as const,
        title: text.name,
        description: text.description,
        href: "/courses",
        meta: course._count.chapters > 0 ? `${course._count.chapters} ${unit}` : null,
      };
    });
  const gameCards: DiscoverItem[] = games.map((game) => ({
      key: `game-${game.id}`,
      kind: "game" as const,
      title: t(game.titleKey),
      description: null,
      href: game.href,
      meta: null,
      gameTextKey: game.textKey,
    }));
  // Afwisselend een cursus en een spel, zodat beide soorten zichtbaar zijn
  // ook als er van één soort veel is.
  const discover: DiscoverItem[] = [];
  for (let i = 0; discover.length < MAX_DISCOVER && (i < courseCards.length || i < gameCards.length); i++) {
    if (courseCards[i]) discover.push(courseCards[i]);
    if (gameCards[i] && discover.length < MAX_DISCOVER) discover.push(gameCards[i]);
  }

  return {
    firstName: user.handle,
    partOfDay: partOfDay(),
    streak: { current: user.currentStreak, studiedToday: user.lastStudyDate === today },
    actions: openActions(gameStatus, friendRequests),
    continueItems,
    dailyText,
    wordGame: wordGameEntry
      ? { href: wordGameEntry.href, status: !wordGame ? "todo" : wordGame.status === "IN_PROGRESS" ? "in-progress" : "done", won: wordGame?.status === "WON" }
      : null,
    dailyQuiz: quizEntry
      ? { href: "/alleskenner/alleen", status: !dailyQuiz ? "todo" : dailyQuiz.status === "IN_PROGRESS" ? "in-progress" : "done" }
      : null,
    social: { friendCount: friends.length, online, viewerSharesOnline: user.shareOnlineStatus },
    discover,
  };
}
