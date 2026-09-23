import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings, updateGameSettings } from "@/lib/gameSettings";

const schema = z.object({
  wordGameEnabled: z.boolean().optional(),
  scrabbleEnabled: z.boolean().optional(),
  gezinsavondEnabled: z.boolean().optional(),
  chapterGuessEnabled: z.boolean().optional(),
  challengesEnabled: z.boolean().optional(),
  liveExercisesEnabled: z.boolean().optional(),
  alleskennerEnabled: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  return NextResponse.json(await getGameSettings());
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Niets om op te slaan" }, { status: 400 });
  }

  return NextResponse.json(await updateGameSettings(parsed.data));
}
