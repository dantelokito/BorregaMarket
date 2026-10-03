import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { PublicFooter } from "@/components/legal/PublicFooter";
import { getPublicLegalSettings } from "@/lib/services/legal.service";
import { LoginPageClient } from "./LoginPageClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getPublicLegalSettings();
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-md px-6 py-16">
        <LoginPageClient />
      </div>
      <PublicFooter settings={settings} />
    </div>
  );
}
