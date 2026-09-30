import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isEmailConfigured } from "@/lib/email";
import { getTodayData } from "@/lib/today";
import Greeting from "@/components/today/Greeting";
import OpenActions from "@/components/today/OpenActions";
import ContinueSection from "@/components/today/ContinueSection";
import TodaySection from "@/components/today/TodaySection";
import SocialPreview from "@/components/today/SocialPreview";
import DiscoverySection from "@/components/today/DiscoverySection";

// Vandaag: de persoonlijke startpagina (zie docs/VERSADO-DESIGN.md). Eerst
// wat op je wacht, dan waar je gebleven was, de dagelijkse content, je
// vrienden en iets nieuws. Op desktop twee kolommen: de sociale context
// staat dan rechts naast de rest in plaats van eronder.
// Volledige klassennamen, zodat Tailwind ze vindt.
const ROW_SPANS: Record<number, string> = { 1: "lg:row-span-1", 2: "lg:row-span-2", 3: "lg:row-span-3", 4: "lg:row-span-4" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.emailVerifiedAt && (await isEmailConfigured())) redirect("/verify-email");
  if (!user.onboardingSeenAt) redirect("/onboarding");

  const data = await getTodayData(user);
  const language = user.uiLanguage;
  // Aantal blokken in de hoofdkolom: de sociale kolom overspant op desktop
  // precies zoveel rijen (lege extra rijen zouden anders ruimte kosten).
  const mainBlocks = 1 + (data.actions.length > 0 ? 1 : 0) + (data.continueItems.length > 0 ? 1 : 0) + (data.discover.length > 0 ? 1 : 0);

  return (
    <div className="vs-motion mx-auto flex max-w-5xl flex-col gap-8 sm:gap-10">
      <Greeting data={data} language={language} />
      <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-8 lg:gap-y-10">
        {data.actions.length > 0 && (
          <div className="min-w-0 lg:col-start-1">
            <OpenActions actions={data.actions} language={language} />
          </div>
        )}
        {data.continueItems.length > 0 && (
          <div className="min-w-0 lg:col-start-1">
            <ContinueSection items={data.continueItems} language={language} />
          </div>
        )}
        <div className="min-w-0 lg:col-start-1">
          <TodaySection data={data} language={language} />
        </div>
        <div
          className={`min-w-0 lg:col-start-2 lg:row-start-1 lg:self-start lg:sticky lg:top-[calc(var(--header-height,4.5rem)+1.5rem)] ${ROW_SPANS[mainBlocks]}`}
        >
          <SocialPreview social={data.social} language={language} />
        </div>
        {data.discover.length > 0 && (
          <div className="min-w-0 lg:col-start-1">
            <DiscoverySection items={data.discover} language={language} />
          </div>
        )}
      </div>
    </div>
  );
}
