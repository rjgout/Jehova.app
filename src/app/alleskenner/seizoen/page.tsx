import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import SeasonListClient from "@/components/alleskenner/SeasonListClient";

export default async function AlleskennerSeasonsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) redirect("/live");
  return <SeasonListClient />;
}
