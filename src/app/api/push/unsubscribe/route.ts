import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: parsed.data.endpoint } });
  return NextResponse.json({ ok: true });
}
