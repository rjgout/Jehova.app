import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import { getContentContext } from "@/lib/contentCollections";
import LiveLobbyForm from "@/components/LiveLobbyForm";

export default async function LivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [settings, contentContext] = await Promise.all([getGameSettings(), getContentContext(user.id)]);
  return <LiveLobbyForm settings={settings} isAdmin={user.isAdmin} allowedGameKeys={contentContext.gameKeys} />;
}
