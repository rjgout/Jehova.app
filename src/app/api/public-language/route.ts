import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LANGUAGES } from "@/lib/languages";

const schema = z.object({ language: z.enum(LANGUAGES.filter((language) => language.uiReady).map((language) => language.code) as [string, ...string[]]) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige taal." }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("versado_language", parsed.data.language, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
