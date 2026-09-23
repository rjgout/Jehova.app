import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import GameRoom from "@/components/GameRoom";
import ChapterGuessGameRoom from "@/components/ChapterGuessGameRoom";
import FamilyGameRoom from "@/components/FamilyGameRoom";
import AlleskennerRoom from "@/components/alleskenner/AlleskennerRoom";

export default async function LiveGamePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Bepaalt hier (server-side) al welke spelmodus dit is, zodat we het
  // juiste client-component renderen. Bestaat de code niet (of nog niet
  // gesynchroniseerd), dan valt dit terug op GameRoom — dat toont zelf al
  // een nette foutmelding zodra de socket "join_game" niets vindt.
  const game = await prisma.liveGame.findUnique({ where: { code: upperCode }, select: { mode: true } });

  if (game?.mode === "CHAPTER_GUESS") {
    return <ChapterGuessGameRoom code={upperCode} myUserId={user.id} />;
  }
  if (game?.mode === "ALLESKENNER") {
    return <AlleskennerRoom code={upperCode} />;
  }
  if (game?.mode === "FAMILY_GAME") {
    return <FamilyGameRoom code={upperCode} myUserId={user.id} />;
  }
  return <GameRoom code={upperCode} myUserId={user.id} />;
}
