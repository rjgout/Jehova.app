import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateInviteCode, regenerateInviteCode } from "@/lib/friendInvite";
import { apiError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  return NextResponse.json({ code: await getOrCreateInviteCode(user.id) });
}

// "Nieuwe link maken": de oude link werkt daarna niet meer.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  return NextResponse.json({ code: await regenerateInviteCode(user.id) });
}
