import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { getSoloOverview, startSoloRun } from "@/lib/alleskenner/solo";

// De Alleskenner alleen spelen: overzicht met klassementen, en een nieuw potje
// beginnen. Het spel zelf loopt via de socketserver (ak:solo_join).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  return NextResponse.json(await getSoloOverview(user.id));
}

const startSchema = z.object({ mode: z.enum(["DAILY", "PRACTICE"]) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) {
    return NextResponse.json({ error: "De Alleskenner staat (nog) niet aan." }, { status: 403 });
  }
  const parsed = startSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const result = await startSoloRun(user.id, parsed.data.mode);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result);
}
