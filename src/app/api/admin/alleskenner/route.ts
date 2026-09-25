import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { alleskennerItems } from "../../../../../prisma/alleskennerContent";
import { generatedAlleskennerItems } from "../../../../../prisma/alleskennerGenerated";
import { apiError } from "@/lib/apiError";

// Alle Alleskenner-onderdelen voor de editor in /adminbackend. Nieuwe
// onderdelen toevoegen kan hier bewust niet (zie docs/ALLESKENNER.md, "Inhoud").
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const items = await prisma.alleskennerItem.findMany({
    orderBy: { id: "asc" },
    select: { id: true, kind: true, data: true, enabled: true, editedByAdmin: true, updatedAt: true },
  });
  const inFile = new Set([...alleskennerItems, ...generatedAlleskennerItems()].map((i) => i.id));
  return NextResponse.json({
    items: items.map((item) => ({ ...item, data: JSON.parse(item.data), inFile: inFile.has(item.id) })),
  });
}
