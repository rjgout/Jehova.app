import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import FriendsClient from "@/components/FriendsClient";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { appName } = await getBranding();
  return <FriendsClient appName={resolveAppName(appName)} />;
}
