import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { assertWordSearchContext, getActiveWordSearch } from "@/lib/wordSearch/game";
import WordSearchClient from "@/components/WordSearchClient";

export default async function WordSearchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [settings, context] = await Promise.all([getGameSettings(), assertWordSearchContext(user.id)]);
  if ((!settings.wordSearchEnabled && !user.isAdmin) || !context) redirect("/live");
  return <WordSearchClient initialGame={await getActiveWordSearch(user.id)} />;
}
