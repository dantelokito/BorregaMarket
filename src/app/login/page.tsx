import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-md px-6 py-16">
        <LoginPageClient />
      </div>
    </div>
  );
}
