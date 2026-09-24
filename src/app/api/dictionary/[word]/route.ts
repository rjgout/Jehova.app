import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findVersesContainingWord } from "@/lib/dictionary";
import { getContentContext } from "@/lib/contentCollections";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ word: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { word } = await params;
  const { active } = await getContentContext(user.id);
  const verses = await findVersesContainingWord(decodeURIComponent(word), active.id);
  return NextResponse.json({ verses });
}
