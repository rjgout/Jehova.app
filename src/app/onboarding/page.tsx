import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isEmailConfigured } from "@/lib/email";
import OnboardingClient from "@/components/OnboardingClient";

// Bereikbaar op twee manieren: automatisch vanuit de !onboardingSeenAt-redirect
// in dashboard/page.tsx (nieuwe gebruikers), of handmatig via de
// "Rondleiding opnieuw bekijken"-knop op het profiel (ProfileClient.tsx) —
// in dat laatste geval mag deze pagina gewoon opnieuw doorlopen worden, ook
// al is onboardingSeenAt al gezet.
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const emailConfigured = await isEmailConfigured();

  return (
    <OnboardingClient
      email={user.email}
      searchableByEmail={user.searchableByEmail}
      shareOnlineStatus={user.shareOnlineStatus}
      pushNotificationsEnabled={user.pushNotificationsEnabled}
      emailNotificationsEnabled={user.emailNotificationsEnabled}
      notifyDailyText={user.notifyDailyText}
      dailyTextTime={user.dailyTextTime}
      emailConfigured={emailConfigured}
    />
  );
}
