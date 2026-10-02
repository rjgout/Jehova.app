import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import GroupsClient from "@/components/social/GroupsClient";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <GroupsClient />;
}
