import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { subscribeUserToCourse } from "@/lib/courses";
import { isContentCollectionSelectable } from "@/lib/contentCollections";
import { apiError } from "@/lib/apiError";

// Zet een cursus (terug) in het eigen overzicht, zonder hem de actieve
// cursus te maken: dat gebeurt pas als je er een les van opent (zie
// markCourseStarted). Eerder opgebouwde voortgang komt gewoon terug, want
// verbergen (unsubscribe) zet alleen `subscribed` uit.
export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { enabled: true, contentCollectionId: true } });
  if (!course || !course.enabled || !(await isContentCollectionSelectable(course.contentCollectionId, user.isAdmin))) {
    return await apiError("apiErrors.courseNotFound", 404);
  }

  await subscribeUserToCourse(prisma, user.id, courseId);
  return NextResponse.json({ ok: true });
}
