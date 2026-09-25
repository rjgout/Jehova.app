import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { forfeitChallenge } from "@/lib/challenges";
import { apiError, apiErrorText } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { challengeId } = await params;
  const result = await forfeitChallenge(user.id, challengeId);
  if (!result.ok) return await apiErrorText(result.error, 400);
  return NextResponse.json({ ok: true });
}
