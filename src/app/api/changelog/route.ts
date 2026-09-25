import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Voor zowel de volledige lijst op het profiel als de "nieuw sinds je laatste
// bezoek"-pop-up (ChangelogPopup.tsx): één plek die bepaalt wat "nieuw" is,
// i.p.v. dat de client zelf gaat vergelijken. seenAt gaat mee in de respons
// (het moment van VÓÓR dit verzoek) zodat de pop-up zelf kan filteren welke
// items nieuw zijn, zonder dat markeren-als-gezien (POST .../seen) daar al
// tussen zit.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const entries = await prisma.changelogEntry.findMany({ orderBy: { createdAt: "desc" } });
  const hasUnseen = user.changelogEnabled && entries.some((e) => e.createdAt > user.changelogSeenAt);

  return NextResponse.json({
    entries: entries.map((e) => ({ id: e.id, title: e.title, body: e.body, createdAt: e.createdAt })),
    seenAt: user.changelogSeenAt,
    changelogEnabled: user.changelogEnabled,
    hasUnseen,
  });
}
