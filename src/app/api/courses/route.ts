import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getContentContext } from "@/lib/contentCollections";
import { getT } from "@/lib/i18n";
import { apiError } from "@/lib/apiError";
import { getSubscribedCourseSummaries } from "@/lib/courseSummaries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const contentContext = await getContentContext(user.id);
  const t = getT(user.uiLanguage);
  const result = await getSubscribedCourseSummaries(user, contentContext.active.id, t);
  return NextResponse.json({ courses: result });
}
