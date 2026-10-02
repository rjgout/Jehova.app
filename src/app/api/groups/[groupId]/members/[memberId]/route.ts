import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { removeMember, setMemberRole } from "@/lib/social/groups";
import { socialError } from "@/lib/social/http";

// Beheerdersacties op één lid. De rechten worden in groups.ts gecontroleerd.
const schema = z.object({ action: z.enum(["remove", "make-admin", "remove-admin"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string; memberId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  const { groupId, memberId } = await params;
  try {
    if (parsed.data.action === "remove") await removeMember(user.id, groupId, memberId);
    else await setMemberRole(user.id, groupId, memberId, parsed.data.action === "make-admin" ? "ADMIN" : "MEMBER");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return socialError(error);
  }
}
