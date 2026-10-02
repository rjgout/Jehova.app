import Link from "next/link";
import { redirect } from "next/navigation";
import { Link2Off, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import { getT } from "@/lib/i18n";
import { requestLanguage } from "@/lib/requestLanguage";
import { groupLinkView } from "@/lib/social/joinLinks";
import GroupJoinPreview from "@/components/social/GroupJoinPreview";
import { primaryButton, secondaryButton, surfaceCard } from "@/components/versado/styles";

// Groepslink/QR: de voordeur van een besloten groep. Ook zonder inlog
// bereikbaar (een poster, een appje), maar dan zonder enig groepsgegeven:
// alleen de vraag om in te loggen. Ongeldig of ingetrokken: een neutrale
// melding, ook geen naam. Zie src/lib/social/joinLinks.ts.
export default async function GroupLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const [view, branding] = await Promise.all([groupLinkView(token, user?.id ?? null), getBranding()]);
  const t = getT(await requestLanguage(user));
  const appName = resolveAppName(branding.appName);

  if (view.state === "member") redirect(`/groups/${view.groupId}`);

  if (view.state === "invalid") {
    return (
      <div className={`${surfaceCard} mx-auto flex w-full max-w-md flex-col items-center gap-3 p-6 text-center`}>
        <Link2Off className="h-10 w-10 text-vs-fg-3" aria-hidden />
        <h1 className="text-xl font-extrabold text-vs-fg">{t("together.join.invalidTitle")}</h1>
        <p className="text-sm text-vs-fg-2">{t("together.join.invalidText")}</p>
        <Link href={user ? "/dashboard" : "/login"} className={primaryButton}>
          {t("together.join.toApp", { app: appName })}
        </Link>
      </div>
    );
  }

  if (view.state === "login") {
    const next = encodeURIComponent(`/uitnodiging/groep/${token}`);
    return (
      <div className={`${surfaceCard} mx-auto flex w-full max-w-md flex-col items-center gap-3 p-6 text-center`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-vs-accent-soft text-vs-accent">
          <UsersRound className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-xl font-extrabold text-vs-fg">{t("together.join.loginTitle", { app: appName })}</h1>
        <p className="text-sm text-vs-fg-2">{t("together.join.loginText")}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link href={`/login?next=${next}`} className={`${primaryButton} w-full`}>
            {t("together.join.login")}
          </Link>
          <Link href={`/register?next=${next}`} className={`${secondaryButton} w-full`}>
            {t("together.join.register")}
          </Link>
        </div>
      </div>
    );
  }

  return <GroupJoinPreview token={token} view={view} />;
}
