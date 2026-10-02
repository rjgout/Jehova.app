import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { offerGroupFreeze } from "@/lib/social/groupFreeze";
import { socialError } from "@/lib/social/http";

/** Een eigen reeksbevriezing aanbieden voor de groepsdag van vandaag (geen XP). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const { groupId } = await params;
  try {
    return NextResponse.json(await offerGroupFreeze(user.id, groupId));
  } catch (error) {
    return socialError(error);
  }
}
