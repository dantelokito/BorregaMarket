import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { ExplorePageClient } from "./ExplorePageClient";

export default function ExplorePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderWrapper />
      <ExplorePageClient />
    </div>
  );
}
