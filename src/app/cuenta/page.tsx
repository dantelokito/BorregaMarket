import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { CuentaPageClient } from "./CuentaPageClient";

export default function CuentaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <CuentaPageClient />
      </div>
    </div>
  );
}
