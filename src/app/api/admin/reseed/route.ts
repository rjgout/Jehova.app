import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getReseedJob, startReseedJob } from "@/lib/reseedJob";
import { apiError } from "@/lib/apiError";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);
  return null;
}

// Admin-versie van `npm run db:seed`: laadt content (boeken/hoofdstukken/
// oefeningen, podcastafleveringen, achievements) opnieuw in, zonder dat de
// admin daarvoor een terminal op de NAS hoeft te openen. Draait in-process
// met de gedeelde Prisma-client — geen losse container-exec nodig.
//
// Start de seed-run op de achtergrond (zie src/lib/reseedJob.ts) en
// antwoordt meteen, in plaats van te wachten tot runSeed helemaal klaar is
// — dat kon eerder een valse foutmelding geven als een reverse proxy de
// request eerder liet timeouten dan de seed klaar was. De adminpagina pollt
// GET hieronder voor de voortgang.
export async function POST() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const { started, job } = startReseedJob(prisma);
  return NextResponse.json({ started, job });
}

export async function GET() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  return NextResponse.json({ job: getReseedJob() });
}
