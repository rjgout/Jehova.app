import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const createSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht").max(120, "Titel mag maximaal 120 tekens zijn."),
  body: z.string().trim().min(1, "Tekst is verplicht").max(4000, "Tekst mag maximaal 4000 tekens zijn."),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const entries = await prisma.changelogEntry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const entry = await prisma.changelogEntry.create({ data: parsed.data });
  return NextResponse.json({ entry });
}
