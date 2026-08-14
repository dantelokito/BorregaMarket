import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { AdminPageClient } from "./AdminPageClient";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <AdminPageClient />
    </div>
  );
}
