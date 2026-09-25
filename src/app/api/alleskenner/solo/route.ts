import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { getSoloOverview, startSoloRun } from "@/lib/alleskenner/solo";
import { apiError, apiErrorText } from "@/lib/apiError";

// De Alleskenner alleen spelen: overzicht met klassementen, en een nieuw potje
// beginnen. Het spel zelf loopt via de socketserver (ak:solo_join).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  return NextResponse.json(await getSoloOverview(user.id));
}

const startSchema = z.object({ mode: z.enum(["DAILY", "PRACTICE"]) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) {
    return await apiError("apiErrors.alleskennerOff", 403);
  }
  const parsed = startSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const result = await startSoloRun(user.id, parsed.data.mode);
  if ("error" in result) return await apiErrorText(result.error, 409);
  return NextResponse.json(result);
}
