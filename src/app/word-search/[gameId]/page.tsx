import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { assertWordSearchContext, getWordSearch } from "@/lib/wordSearch/game";
import WordSearchClient from "@/components/WordSearchClient";

export default async function WordSearchGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [settings, context] = await Promise.all([getGameSettings(), assertWordSearchContext(user.id)]);
  if ((!settings.wordSearchEnabled && !user.isAdmin) || !context) redirect("/live");
  const game = await getWordSearch(user.id, (await params).gameId);
  if (!game) redirect("/word-search");
  return <WordSearchClient initialGame={game} />;
}
