import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const courses = await prisma.course.findMany({
    orderBy: [{ contentCollection: { order: "asc" } }, { order: "asc" }],
    select: { id: true, slug: true, type: true, name: true, enabled: true, contentCollection: { select: { name: true } } },
  });

  // Per collectie gegroepeerd in de beheerlijst: elke schriftcollectie heeft
  // een eigen "Van voor naar achter" enz., met dezelfde naam.
  return NextResponse.json({
    courses: courses.map(({ contentCollection, ...course }) => ({ ...course, collectionName: contentCollection.name })),
  });
}
