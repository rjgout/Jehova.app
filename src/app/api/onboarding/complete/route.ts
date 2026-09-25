import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Wordt zowel aangeroepen bij "overslaan" als bij het volledig doorlopen van
// de laatste stap — in beide gevallen mag de flow nooit meer automatisch
// starten (zie de !user.onboardingSeenAt-redirect in dashboard/page.tsx).
// Handmatig herstarten kan alsnog via de knop op de profielpagina, die
// simpelweg naar /onboarding linkt zonder deze route aan te roepen.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  await prisma.user.update({ where: { id: user.id }, data: { onboardingSeenAt: new Date() } });

  return NextResponse.json({ ok: true });
}
