import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import GroupDetailClient from "@/components/social/GroupDetailClient";

export default async function Page({ params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId } = await params;
  return <GroupDetailClient groupId={groupId} />;
}
