import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const schema = z.object({ chapterId: z.string().min(1) });

// Registreert dat een gebruiker een hoofdstuk is gaan lezen — los van de
// quiz erna. Gebruikt voor "ga verder waar je gebleven was" en om lezen
// meetbaar te maken, ook als iemand de quiz niet afmaakt.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const session = await prisma.readingSession.create({
    data: { userId: user.id, chapterId: parsed.data.chapterId },
  });
  return NextResponse.json({ id: session.id });
}
