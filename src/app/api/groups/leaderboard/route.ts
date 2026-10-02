import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { groupLeaderboard } from "@/lib/social/groupViews";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const sort = req.nextUrl.searchParams.get("sort") === "size" ? "size" : "streak";
  return NextResponse.json({ sort, groups: await groupLeaderboard(sort, user.id) });
}
