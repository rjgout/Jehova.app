import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ProfileClient from "@/components/ProfileClient";

// De footer staat in de profielshell (components/profile/ProfilePage.tsx).
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ProfileClient />;
}
