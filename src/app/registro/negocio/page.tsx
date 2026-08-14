import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { BusinessOnboardingClient } from "./BusinessOnboardingClient";

export default function BusinessOnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-lg px-6 py-16">
        <BusinessOnboardingClient />
      </div>
    </div>
  );
}
