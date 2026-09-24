import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDictionaryEntries } from "@/lib/dictionary";
import { getContentContext } from "@/lib/contentCollections";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  // Het woordenboek van de gekozen collectie (Boek van Mormon, Leer en Verbonden, ...).
  const { active } = await getContentContext(user.id);
  return NextResponse.json({ collectionName: active.name, entries: getDictionaryEntries(active.id) });
}
