import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { cancelGroupInvite } from "@/lib/social/groups";
import { socialError } from "@/lib/social/http";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ groupId: string; inviteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const { groupId, inviteId } = await params;
  try {
    await cancelGroupInvite(user.id, groupId, inviteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialError(error);
  }
}
