import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { updateGroupSettings } from "@/lib/social/groups";
import { groupDetail, publicGroup } from "@/lib/social/groupViews";
import { refreshGroup } from "@/lib/social/groupStreak";
import { socialError } from "@/lib/social/http";

// Leden krijgen het volledige groepsscherm; een buitenstaander alleen de
// openbare gegevens van een openbare groep (nooit leden), en anders 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const { groupId } = await params;
  const detail = await groupDetail(groupId, user.id, user.timeZone);
  if (detail) {
    // Bijwerken (gehaalde dag, afgesloten dagen) en dan de actuele stand tonen.
    await refreshGroup(groupId).catch((e) => console.error(`Groep ${groupId}:`, e));
    return NextResponse.json({ member: true, group: await groupDetail(groupId, user.id, user.timeZone) });
  }
  const open = await publicGroup(groupId);
  if (!open) return await apiError("together.errors.groupNotFound", 404);
  return NextResponse.json({ member: false, group: open });
}

const schema = z.object({
  name: z.string().max(200).optional(),
  membersCanInvite: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  const { groupId } = await params;
  try {
    await updateGroupSettings(user.id, groupId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialError(error);
  }
}
