import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateTodayGame } from "@/lib/wordGame";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const view = await getOrCreateTodayGame(user.id);
  return NextResponse.json(view);
}
