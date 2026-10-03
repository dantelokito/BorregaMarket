import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { PublicFooter } from "@/components/legal/PublicFooter";
import { getPublicLegalSettings } from "@/lib/services/legal.service";
import { BusinessOnboardingClient } from "./BusinessOnboardingClient";

export const dynamic = "force-dynamic";

export default async function BusinessOnboardingPage() {
  const settings = await getPublicLegalSettings();
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-lg px-6 py-16">
        <BusinessOnboardingClient />
      </div>
      <PublicFooter settings={settings} />
    </div>
  );
}
