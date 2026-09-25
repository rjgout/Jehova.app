import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";
import { notificationCount } from "@/lib/notify";
import { apiError } from "@/lib/apiError";

// Laat iemand direct checken of pushmeldingen op dit apparaat aankomen,
// zonder te moeten wachten op een echte gebeurtenis (vriendschapsverzoek,
// dagelijkse herinnering, ...) — zelfde gedachte als "Testmail versturen"
// bij de e-mailinstellingen.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (count === 0) {
    return await apiError("apiErrors.noPushSubscription", 400);
  }

  // Bewust met vertraging en vanaf de server: zo kun je de app sluiten en
  // zien of de melding én de badge op het beginschermicoon verschijnen. Een
  // gesloten iOS-app voert zelf geen JavaScript meer uit, dus een timer in de
  // browser zou nooit afgaan. De badge toont het aantal meldingen in het
  // meldingencentrum (minstens 1); de app zet hem weer goed zodra je hem opent.
  setTimeout(() => {
    sendDelayedTestPush(user.id).catch((e) => console.error("Testmelding versturen mislukt:", e));
  }, TEST_PUSH_DELAY_SECONDS * 1000);

  return NextResponse.json({ ok: true, delaySeconds: TEST_PUSH_DELAY_SECONDS });
}

const TEST_PUSH_DELAY_SECONDS = 5;

async function sendDelayedTestPush(userId: string): Promise<void> {
  // Minstens 1, zodat je ook de badge op het app-icoon kunt testen; de
  // testmelding zelf komt niet in het meldingencentrum.
  const badge = Math.max(1, await notificationCount(userId));
  await sendPushToUser(userId, {
    title: "Testmelding 🔔",
    body: "Als je dit ziet, werken pushmeldingen op dit apparaat! Staat er ook een badge op het app-icoon?",
    url: "/profile",
    badge,
  });
}
