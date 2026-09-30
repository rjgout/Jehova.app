import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ActivityFeedClient from "@/components/ActivityFeedClient";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ActivityFeedClient />;
}
