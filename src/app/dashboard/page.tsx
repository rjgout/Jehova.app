export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { getTextOfTheDay } from "@/lib/dailyText";
import { getT } from "@/lib/i18n";
import { BOFM_WORK, resolveEditionId } from "@/lib/contentCollections";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.emailVerifiedAt && (await isEmailConfigured())) redirect("/verify-email");
  if (!user.onboardingSeenAt) redirect("/onboarding");
  const t = getT(user.uiLanguage);
  // Leesvoortgang van het Boek van Mormon in de eigen contenttaal; niet alle
  // hoofdstukken in de database (daar staan ook andere werken en talen in).
  const bomEditionId = await resolveEditionId(BOFM_WORK, user.contentLanguage);
  const bomEdition = bomEditionId
    ? await prisma.contentCollection.findUnique({ where: { id: bomEditionId }, select: { name: true } })
    : null;
  const inBomEdition = bomEditionId ? { book: { contentCollectionId: bomEditionId } } : {};

  const [
    dailyText,
    bomChapters,
    friendships,
    pendingChallenges,
    scrabbleTurns,
    pendingFriendRequests,
  ] = await Promise.all([
    getTextOfTheDay(new Date(), user.contentLanguage),
    prisma.chapter.count({ where: inBomEdition }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
      select: { senderId: true, receiverId: true, sender: { select: { id: true, handle: true, shareOnlineStatus: true, onlineSocketCount: true } }, receiver: { select: { id: true, handle: true, shareOnlineStatus: true, onlineSocketCount: true } } },
    }),
    prisma.challenge.findMany({
      where: { receiverId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, sender: { select: { handle: true } }, chapterId: true, chapter: { select: { number: true, book: { select: { name: true } } } } },
    }),
    prisma.scrabbleGame.findMany({
      where: { status: "ACTIVE", turnUserId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, player1Id: true, player2Id: true, player1: { select: { handle: true } }, player2: { select: { handle: true } } },
    }),
    prisma.friendship.count({ where: { receiverId: user.id, status: "PENDING" } }),
  ]);

  const total = bomChapters;
  const completed = await prisma.chapterProgress.count({
    where: { userId: user.id, completed: true, chapter: inBomEdition },
  });
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const friends = friendships.map((friendship) => (friendship.senderId === user.id ? friendship.receiver : friendship.sender));
  const onlineFriends = friends.filter((friend) => friend.shareOnlineStatus && friend.onlineSocketCount > 0).length;

  const actions = [
    ...Array.from({ length: pendingFriendRequests }, (_, index) => ({
      key: `friend-${index}`,
      icon: "👥",
      text:
        pendingFriendRequests === 1
          ? t("dashboard.friendRequestOne")
          : t("dashboard.friendRequestMany", { n: pendingFriendRequests }),
      href: "/friends",
    })).slice(0, 1),
    ...pendingChallenges.map((challenge) => ({
      key: `challenge-${challenge.id}`,
      icon: "⚔️",
      text: t("dashboard.challenge", {
        name: challenge.sender.handle,
        chapter: `${challenge.chapter.book.name} ${challenge.chapter.number}`,
      }),
      href: `/lesson/${challenge.chapterId}?challengeId=${challenge.id}`,
    })),
    ...scrabbleTurns.map((game) => ({
      key: `scrabble-${game.id}`,
      icon: "🔤",
      text: t("dashboard.yourTurn", { name: game.player1Id === user.id ? game.player2.handle : game.player1.handle }),
      href: `/scrabble/${game.id}`,
    })),
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {dailyText && (
        <section className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white flex flex-col gap-3">
          <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">{t("dashboard.dailyText")}</p>
          <p className="text-xl sm:text-2xl font-extrabold leading-snug">“{dailyText.text}”</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-brand-100">— {dailyText.bookName} {dailyText.chapterNumber}:{dailyText.verseNumber}</p>
            <Link
              href={dailyText.href}
              className="text-sm font-bold rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25 transition"
            >
              {t("dashboard.readMore")}
            </Link>
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{bomEdition?.name ?? "Boek van Mormon"}</p>
            <h2 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("dashboard.progressTitle")}</h2>
          </div>
          <span className="text-sm font-extrabold text-brand-600 dark:text-brand-300">{completed} / {total}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-brand-500 dark:bg-brand-400 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t("dashboard.percentRead", { n: progressPercent })}</span>
          <Link href="/courses" className="font-bold text-brand-600 dark:text-brand-300 hover:underline">{t("dashboard.viewCourses")}</Link>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold dark:text-slate-100">{t("dashboard.friendsOnline")}</h2>
          <Link href="/friends" className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">{t("dashboard.viewFriends")}</Link>
        </div>
        {onlineFriends > 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {onlineFriends === 1 ? t("dashboard.onlineOne", { n: onlineFriends }) : t("dashboard.onlineMany", { n: onlineFriends })}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.onlineNone")}</p>
        )}
      </section>

      {actions.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-extrabold dark:text-slate-100">{t("dashboard.openActions")}</h2>
          {actions.map((action) => (
            <Link key={action.key} href={action.href} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3 hover:bg-brand-50 dark:hover:bg-slate-700">
              <span className="text-2xl">{action.icon}</span>
              <span className="font-bold dark:text-slate-100">{action.text}</span>
              <span className="ml-auto text-brand-600 dark:text-brand-300">→</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
