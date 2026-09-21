import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatElapsedDutch } from "@/lib/dates";
import { getEmailSettingsView } from "@/lib/email";
import { getLeagueSettings } from "@/lib/leagues";
import AdminUsersClient from "@/components/AdminUsersClient";
import EmailSettingsClient from "@/components/EmailSettingsClient";
import ReseedClient from "@/components/ReseedClient";
import FeedbackAdminClient from "@/components/FeedbackAdminClient";
import AdminChangelogClient from "@/components/AdminChangelogClient";
import AdminLiveGamesClient from "@/components/AdminLiveGamesClient";
import AdminGameSettingsClient from "@/components/AdminGameSettingsClient";
import AdminCoursesClient from "@/components/AdminCoursesClient";
import AdminBrandingClient from "@/components/AdminBrandingClient";
import AdminLeagueSettingsClient from "@/components/AdminLeagueSettingsClient";
import AdminDeployClient from "@/components/AdminDeployClient";
import { isDeployAgentConfigured } from "@/lib/deployAgent";
import packageJson from "../../../package.json";

export default async function AdminBackendPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  const [users, userCount, bookCount, chapterCount, exerciseCount, emailSettings, leagueSettings] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        handle: true,
        discriminator: true,
        isAdmin: true,
        xpTotal: true,
        currentStreak: true,
        freezeCount: true,
        onlineSocketCount: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
    prisma.book.count(),
    prisma.chapter.count(),
    prisma.exercise.count(),
    getEmailSettingsView(),
    getLeagueSettings(prisma),
  ]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Adminbeheer</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Alleen zichtbaar voor accounts met adminrechten.</p>
          </div>
          <div className="text-right text-xs text-slate-400 dark:text-slate-500 shrink-0">
            <div>v{packageJson.version} · beta</div>
            <div>build {process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) ?? "onbekend"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Gebruikers" value={userCount} />
        <StatCard label="Boeken" value={bookCount} />
        <StatCard label="Hoofdstukken" value={chapterCount} />
        <StatCard label="Oefeningen" value={exerciseCount} />
      </div>

      <AdminDeployClient configured={isDeployAgentConfigured()} />

      <ReseedClient />

      <AdminUsersClient
        initialUsers={users.map(({ onlineSocketCount, lastSeenAt, ...u }) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          online: onlineSocketCount > 0,
          lastSeenLabel: onlineSocketCount > 0 ? null : lastSeenAt ? formatElapsedDutch(lastSeenAt) : "Nog nooit",
        }))}
        currentUserId={user.id}
      />

      <EmailSettingsClient initial={emailSettings} />

      <AdminLeagueSettingsClient initial={{ ...leagueSettings, activityRules: JSON.stringify(leagueSettings.activityRules, null, 2) }} />

      <AdminBrandingClient />

      <FeedbackAdminClient />

      <AdminLiveGamesClient />

      <AdminGameSettingsClient />

      <AdminCoursesClient />

      <AdminChangelogClient />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">{value}</div>
      <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{label}</div>
    </div>
  );
}
