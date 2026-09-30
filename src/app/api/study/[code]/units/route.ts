import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { getT } from "@/lib/i18n";
import { currentUnitKeyFor, studyUnitsForCourse } from "@/lib/study/units";

// De stappen van de cursus van een Samen studeren-sessie, voor de stapkiezer
// van de host. `suggested` is de volgende stap na de laatst gespeelde, of bij
// de eerste ronde de stap waar de host in deze cursus zelf is.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { code } = await params;
  const game = await prisma.liveGame.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      hostId: true,
      mode: true,
      players: { where: { userId: user.id }, select: { id: true } },
      studySession: {
        select: {
          course: { select: { id: true, type: true, podcastId: true } },
          rounds: { orderBy: { number: "desc" }, take: 1, select: { unitKey: true } },
        },
      },
    },
  });
  if (!game || game.mode !== "STUDY" || !game.studySession) return await apiError("apiErrors.gameNotFound", 404);
  if (game.hostId !== user.id && game.players.length === 0) return await apiError("apiErrors.forbidden", 403);

  const course = game.studySession.course;
  const groups = await studyUnitsForCourse(course, getT(user.uiLanguage));
  const keys = groups.flatMap((g) => g.units.map((u) => u.key));
  const lastKey = game.studySession.rounds[0]?.unitKey ?? null;
  let suggested: string | null = null;
  if (lastKey) {
    const index = keys.indexOf(lastKey);
    suggested = index >= 0 ? (keys[index + 1] ?? keys[index]) : null;
  } else {
    const current = await currentUnitKeyFor(game.hostId, course);
    suggested = current && keys.includes(current) ? current : null;
  }
  return NextResponse.json({ groups, suggested: suggested ?? keys[0] ?? null });
}
