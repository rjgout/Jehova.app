import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { createGroup } from "@/lib/social/groups";
import { listMyGroups } from "@/lib/social/groupViews";
import { socialError } from "@/lib/social/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  return NextResponse.json(await listMyGroups(user.id, user.timeZone));
}

const schema = z.object({ name: z.string().max(200) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);
  try {
    return NextResponse.json(await createGroup(user.id, parsed.data.name));
  } catch (error) {
    return socialError(error);
  }
}
