import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import GroupSettingsClient from "@/components/social/GroupSettingsClient";

export default async function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId } = await params;
  return <GroupSettingsClient groupId={groupId} />;
}
