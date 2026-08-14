import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { AnalyticsPageClient } from "./AnalyticsPageClient";

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderWrapper />
      <AnalyticsPageClient />
    </div>
  );
}
