import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import SoloClient from "@/components/alleskenner/SoloClient";

export default async function AlleskennerSoloPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) redirect("/live");
  return <SoloClient myUserId={user.id} />;
}
