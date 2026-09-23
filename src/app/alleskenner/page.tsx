import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";
import AlleskennerSetupClient from "@/components/alleskenner/AlleskennerSetupClient";

export default async function AlleskennerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) redirect("/live");
  return <AlleskennerSetupClient />;
}
