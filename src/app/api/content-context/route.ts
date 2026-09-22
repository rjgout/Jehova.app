import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getContentContext, setActiveContentCollection } from "@/lib/contentCollections";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  return NextResponse.json(await getContentContext(user.id));
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const collectionId = typeof body?.contentCollectionId === "string" ? body.contentCollectionId : "";
  if (!collectionId) return NextResponse.json({ error: "Geen contentcollectie gekozen" }, { status: 400 });

  try {
    const active = await setActiveContentCollection(user.id, collectionId);
    return NextResponse.json({ active });
  } catch {
    return NextResponse.json({ error: "Deze contentcollectie is niet beschikbaar." }, { status: 404 });
  }
}
