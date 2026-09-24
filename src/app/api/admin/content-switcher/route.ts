import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import {
  getContentSwitcherSettings,
  listContentCollectionsForAdmin,
  setContentCollectionVisibility,
  updateContentSwitcherSettings,
} from "@/lib/contentCollections";

const bodySchema = z.union([
  z.object({ enabled: z.boolean() }),
  z.object({ contentCollectionId: z.string().min(1), visibleToUsers: z.boolean() }),
]);

async function snapshot() {
  const [settings, collections] = await Promise.all([getContentSwitcherSettings(), listContentCollectionsForAdmin()]);
  return { ...settings, collections };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  return NextResponse.json(await snapshot());
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  const body = parsed.data;
  if ("enabled" in body) {
    await updateContentSwitcherSettings(body.enabled);
  } else {
    try {
      await setContentCollectionVisibility(body.contentCollectionId, body.visibleToUsers);
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith("Er moet")
        ? error.message
        : "Deze content bestaat niet.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  return NextResponse.json(await snapshot());
}
