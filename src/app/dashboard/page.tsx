export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { getTextOfTheDay } from "@/lib/dailyText";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.emailVerifiedAt && !user.isDemoSeed && (await isEmailConfigured())) redirect("/verify-email");
  if (!user.onboardingSeenAt) redirect("/onboarding");

  const [
    dailyText,
    bomChapters,
    friendships,
    pendingChallenges,
    scrabbleTurns,
    pendingFriendRequests,
  ] = await Promise.all([
    getTextOfTheDay(),
    prisma.chapter.count({ where: { book: { name: "Boek van Mormon" } } }),
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
    where: { userId: user.id, completed: true, chapter: { book: { name: "Boek van Mormon" } } },
  });
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const friends = friendships.map((friendship) => (friendship.senderId === user.id ? friendship.receiver : friendship.sender));
  const onlineFriends = friends.filter((friend) => friend.shareOnlineStatus && friend.onlineSocketCount > 0).length;

  const actions = [
    ...Array.from({ length: pendingFriendRequests }, (_, index) => ({
      key: `friend-${index}`,
      icon: "👥",
      text: pendingFriendRequests === 1 ? "Je hebt een nieuw vriendschapsverzoek." : `Je hebt ${pendingFriendRequests} openstaande vriendschapsverzoeken.`,
      href: "/friends",
    })).slice(0, 1),
    ...pendingChallenges.map((challenge) => ({
      key: `challenge-${challenge.id}`,
      icon: "⚔️",
      text: `${challenge.sender.handle} daagt je uit op ${challenge.chapter.book.name} ${challenge.chapter.number}.`,
      href: `/lesson/${challenge.chapterId}?challengeId=${challenge.id}`,
    })),
    ...scrabbleTurns.map((game) => ({
      key: `scrabble-${game.id}`,
      icon: "🔤",
      text: `${game.player1Id === user.id ? game.player2.handle : game.player1.handle} wacht op jouw beurt.`,
      href: `/scrabble/${game.id}`,
    })),
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {dailyText && (
        <section className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white flex flex-col gap-3">
          <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">Tekst van de dag</p>
          <p className="text-xl sm:text-2xl font-extrabold leading-snug">“{dailyText.text}”</p>
          <p className="text-sm text-brand-100">— {dailyText.bookName} {dailyText.chapterNumber}:{dailyText.verseNumber}</p>
        </section>
      )}

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Boek van Mormon</p>
            <h2 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">Leesvoortgang</h2>
          </div>
          <span className="text-sm font-extrabold text-brand-600 dark:text-brand-300">{completed} / {total}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">{progressPercent}% gelezen</span>
          <Link href="/courses" className="font-bold text-brand-600 dark:text-brand-300 hover:underline">Bekijk cursussen →</Link>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold dark:text-slate-100">Vrienden online</h2>
          <Link href="/friends" className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">Bekijk vrienden →</Link>
        </div>
        {onlineFriends > 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">🟢 {onlineFriends} {onlineFriends === 1 ? "vriend is" : "vrienden zijn"} nu online.</p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Niemand van je vrienden die zijn online-status deelt is nu online.</p>
        )}
      </section>

      {actions.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-extrabold dark:text-slate-100">Openstaande acties</h2>
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
