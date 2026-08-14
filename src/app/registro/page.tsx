import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { RegisterPageClient } from "./RegisterPageClient";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-md px-6 py-16">
        <RegisterPageClient />
      </div>
    </div>
  );
}
