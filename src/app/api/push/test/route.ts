import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";

// Laat iemand direct checken of pushmeldingen op dit apparaat aankomen,
// zonder te moeten wachten op een echte gebeurtenis (vriendschapsverzoek,
// dagelijkse herinnering, ...) — zelfde gedachte als "Testmail versturen"
// bij de e-mailinstellingen.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (count === 0) {
    return NextResponse.json(
      { error: "Geen actieve pushsubscriptie gevonden. Zet pushmeldingen hierboven aan." },
      { status: 400 }
    );
  }

  // Bewust met vertraging en vanaf de server: zo kun je de app sluiten en
  // zien of de melding én de badge op het beginschermicoon verschijnen. Een
  // gesloten iOS-app voert zelf geen JavaScript meer uit, dus een timer in de
  // browser zou nooit afgaan. De badge telt net als bij echte meldingen mee
  // en wordt weer gewist zodra je de app opent (NotificationBadgeClear).
  setTimeout(() => {
    sendDelayedTestPush(user.id).catch((e) => console.error("Testmelding versturen mislukt:", e));
  }, TEST_PUSH_DELAY_SECONDS * 1000);

  return NextResponse.json({ ok: true, delaySeconds: TEST_PUSH_DELAY_SECONDS });
}

const TEST_PUSH_DELAY_SECONDS = 5;

async function sendDelayedTestPush(userId: string): Promise<void> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { notificationBadgeCount: { increment: 1 } },
    select: { notificationBadgeCount: true },
  });
  await sendPushToUser(userId, {
    title: "Testmelding 🔔",
    body: "Als je dit ziet, werken pushmeldingen op dit apparaat! Staat er ook een badge op het app-icoon?",
    url: "/profile",
    badge: updated.notificationBadgeCount,
  });
}
