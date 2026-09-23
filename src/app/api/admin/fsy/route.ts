import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFsySettings, syncFsyContent, updateFsyAutoPublish } from "@/lib/fsyContent";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  if (!user.isAdmin) return { response: NextResponse.json({ error: "Geen toegang" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const [settings, lessons] = await Promise.all([
    getFsySettings(prisma),
    prisma.fsyLesson.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }, { order: "asc" }],
      select: {
        id: true,
        year: true,
        month: true,
        category: true,
        title: true,
        content: true,
        images: true,
        sourceUrl: true,
        status: true,
        publishedTitle: true,
        publishedAt: true,
        lastScrapedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    settings,
    lessons: lessons.map((lesson) => ({
      ...lesson,
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      lastScrapedAt: lesson.lastScrapedAt.toISOString(),
    })),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (typeof body?.autoPublish !== "boolean") {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  await updateFsyAutoPublish(prisma, body.autoPublish);
  return NextResponse.json(await getFsySettings(prisma));
}

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  // De gewone admin-knop "Content opnieuw laden" is de primaire handmatige
  // scraperactie. Dit endpoint is bewust aanvullend voor een gerichte FSY-check.
  await syncFsyContent(prisma);
  return NextResponse.json(await getFsySettings(prisma));
}
