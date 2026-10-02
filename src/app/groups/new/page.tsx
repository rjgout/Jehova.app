import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import NewGroupClient from "@/components/social/NewGroupClient";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <NewGroupClient />;
}
