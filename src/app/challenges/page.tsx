import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ChallengesClient from "@/components/ChallengesClient";
import { getT } from "@/lib/i18n";

export default async function ChallengesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<p className="text-slate-400 dark:text-slate-500">{getT(user.uiLanguage)("common.loading")}</p>}>
      <ChallengesClient />
    </Suspense>
  );
}
