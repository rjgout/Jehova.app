import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const patchSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht").max(120, "Titel mag maximaal 120 tekens zijn.").optional(),
  body: z.string().trim().min(1, "Tekst is verplicht").max(4000, "Tekst mag maximaal 4000 tekens zijn.").optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { entryId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return await apiError("apiErrors.nothingToSave", 400);
  }

  const entry = await prisma.changelogEntry.findUnique({ where: { id: entryId } });
  if (!entry) return await apiError("apiErrors.itemNotFound", 404);

  await prisma.changelogEntry.update({ where: { id: entryId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { entryId } = await params;
  await prisma.changelogEntry.delete({ where: { id: entryId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
