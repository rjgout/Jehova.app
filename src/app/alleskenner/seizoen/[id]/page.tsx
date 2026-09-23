import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import SeasonClient from "@/components/alleskenner/SeasonClient";

export default async function AlleskennerSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) redirect("/live");
  const { id } = await params;
  return <SeasonClient id={id} />;
}
