import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { APP_TAGLINE, resolveAppName } from "@/lib/brand";
import { formatTag } from "@/lib/handle";
import { findInviter, INVALID_INVITE_ERROR } from "@/lib/friendInvite";
import UserAvatar from "@/components/UserAvatar";
import InviteAcceptButton from "@/components/InviteAcceptButton";

// Bewust ook zonder inlog bereikbaar: dit is de pagina die iemand via een
// appje opent, vaak nog zonder account.
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [user, inviter, branding] = await Promise.all([getCurrentUser(), findInviter(code), getBranding()]);
  const appName = resolveAppName(branding.appName);

  if (!inviter) {
    return (
      <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center">
        <div className="text-5xl" aria-hidden>
          🔗
        </div>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{INVALID_INVITE_ERROR}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vraag degene die je uitnodigde om een nieuwe link.
        </p>
        {user ? (
          <Link href="/friends" className="btn-primary">
            Naar je vrienden
          </Link>
        ) : (
          <Link href="/register" className="btn-primary">
            Toch een account maken
          </Link>
        )}
      </div>
    );
  }

  const inviterTag = formatTag(inviter.handle, inviter.discriminator);

  let action: React.ReactNode;
  if (!user) {
    action = (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Maak een account, dan zijn jullie meteen vrienden.
        </p>
        <div className="flex flex-col gap-2 w-full">
          <Link href={`/register?invite=${encodeURIComponent(code)}`} className="btn-primary">
            Account maken
          </Link>
          <Link href={`/login?next=${encodeURIComponent(`/uitnodiging/${code}`)}`} className="btn-secondary">
            Ik heb al een account
          </Link>
        </div>
      </>
    );
  } else if (user.id === inviter.id) {
    action = (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dit is je eigen uitnodigingslink. Stuur hem naar iemand die je wilt uitnodigen.
        </p>
        <Link href="/friends" className="btn-primary">
          Naar je vrienden
        </Link>
      </>
    );
  } else {
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: inviter.id, receiverId: user.id },
          { senderId: user.id, receiverId: inviter.id },
        ],
      },
      select: { id: true },
    });
    action = friendship ? (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">Jullie zijn al vrienden.</p>
        <Link href="/friends" className="btn-primary">
          Naar je vrienden
        </Link>
      </>
    ) : (
      <InviteAcceptButton code={code} inviterId={inviter.id} inviterName={inviter.handle} />
    );
  }

  return (
    <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center">
      <UserAvatar id={inviter.id} handle={inviter.handle} avatarEmoji={inviter.avatarEmoji} size="md" />
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
        {inviterTag} nodigt je uit voor {appName}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
      {action}
    </div>
  );
}
