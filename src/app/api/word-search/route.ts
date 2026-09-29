import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { apiError } from "@/lib/apiError";
import { assertWordSearchContext, getActiveWordSearch, startWordSearch } from "@/lib/wordSearch/game";

const schema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  theme: z.literal("RANDOM").default("RANDOM"),
});

async function canPlay(userId: string, isAdmin: boolean) {
  const [settings, context] = await Promise.all([getGameSettings(), assertWordSearchContext(userId)]);
  return context && (settings.wordSearchEnabled || isAdmin) ? context : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!(await canPlay(user.id, user.isAdmin))) return await apiError("apiErrors.forbidden", 403);
  return NextResponse.json({ game: await getActiveWordSearch(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!(await canPlay(user.id, user.isAdmin))) return await apiError("apiErrors.forbidden", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  try {
    return NextResponse.json(await startWordSearch(user.id, parsed.data.difficulty, parsed.data.theme));
  } catch {
    return await apiError("apiErrors.invalidInput", 500);
  }
}
