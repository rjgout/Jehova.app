import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { leaveGroup } from "@/lib/social/groups";
import { socialError } from "@/lib/social/http";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const { groupId } = await params;
  try {
    await leaveGroup(user.id, groupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialError(error);
  }
}
