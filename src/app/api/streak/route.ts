import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStreakOverview } from "@/lib/streakCalendar";
import { apiError } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam !== null ? Number(yearParam) : undefined;
  const month = monthParam !== null ? Number(monthParam) : undefined;
  if (year !== undefined && !Number.isInteger(year)) {
    return await apiError("apiErrors.invalidYear", 400);
  }
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return await apiError("apiErrors.invalidMonth", 400);
  }

  const overview = await getStreakOverview(user.id, year, month);
  return NextResponse.json(overview);
}
