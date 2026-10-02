import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import GroupLeaderboardClient from "@/components/social/GroupLeaderboardClient";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <GroupLeaderboardClient />;
}
