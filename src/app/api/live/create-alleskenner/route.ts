import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { createAlleskennerGame } from "@/lib/alleskenner/game";

// Maakt een lobby voor De Alleskenner (zie docs/ALLESKENNER.md). De maker is
// host en standaard quizmaster; spelers en toeschouwers melden zich in de
// lobby zelf aan via de socketserver (src/server/alleskenner.ts).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) {
    return NextResponse.json({ error: "De Alleskenner staat (nog) niet aan." }, { status: 403 });
  }

  const game = await createAlleskennerGame(user.id);
  return NextResponse.json({ code: game.code });
}
