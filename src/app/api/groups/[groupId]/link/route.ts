import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { enableGroupLink, revokeGroupLink } from "@/lib/social/joinLinks";
import { socialError } from "@/lib/social/http";

// Groepslink aanzetten of intrekken (alleen beheerders, gecontroleerd in joinLinks.ts).
const schema = z.object({ action: z.enum(["enable", "revoke"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  const { groupId } = await params;
  try {
    if (parsed.data.action === "revoke") {
      await revokeGroupLink(user.id, groupId);
      return NextResponse.json({ token: null });
    }
    return NextResponse.json({ token: await enableGroupLink(user.id, groupId) });
  } catch (error) {
    return socialError(error);
  }
}
