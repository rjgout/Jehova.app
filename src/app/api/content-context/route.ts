import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getContentContext, setActiveContentCollection, setContentLanguage } from "@/lib/contentCollections";
import { LANGUAGES } from "@/lib/languages";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  return NextResponse.json(await getContentContext(user.id));
}

// Eén van beide: een uitgave kiezen (contentkiezer) of de taal van de content
// wisselen (taalknoppen in de kiezer, profiel).
const putSchema = z.union([
  z.object({ contentCollectionId: z.string().min(1) }),
  z.object({ contentLanguage: z.enum(LANGUAGES.map((language) => language.code) as [string, ...string[]]) }),
]);

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geen contentcollectie of taal gekozen" }, { status: 400 });

  if ("contentLanguage" in parsed.data) {
    try {
      await setContentLanguage(user.id, user.isAdmin, parsed.data.contentLanguage);
      return NextResponse.json(await getContentContext(user.id));
    } catch {
      return NextResponse.json({ error: "Deze taal is (nog) niet beschikbaar." }, { status: 404 });
    }
  }

  try {
    const active = await setActiveContentCollection(user.id, user.isAdmin, parsed.data.contentCollectionId);
    return NextResponse.json({ active });
  } catch {
    return NextResponse.json({ error: "Deze contentcollectie is niet beschikbaar." }, { status: 404 });
  }
}
