"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { FilterBar } from "@/components/explore/FilterBar";
import { ProviderCard } from "@/components/explore/ProviderCard";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { DEMO_PROVIDERS } from "@/types";

export default function ExplorePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const providers = useMemo(() => {
    let list = DEMO_PROVIDERS;
    if (activeFilters.includes("verificado")) {
      list = list.filter((p) => p.isVerified);
    }
    if (activeFilters.includes("frutas")) {
      list = list.filter((p) =>
        p.sampleProducts.some((sp) =>
          ["Mango", "Aguacate", "Naranja", "Plátano", "Fresa", "Sandía"].some((f) =>
            sp.name.includes(f)
          )
        )
      );
    }
    return list;
  }, [activeFilters]);

  function toggleFilter(id: string) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />

      {/* Split view — Airbnb style */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: listings grid */}
        <div className="lg:w-[55%] xl:w-[58%] overflow-y-auto px-6 py-6">
          <p className="text-sm text-gray-600 mb-5">
            Más de {providers.length} fruterías en Monterrey
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isHovered={hoveredId === provider.id}
                onHover={() => setHoveredId(provider.id)}
                onLeave={() => setHoveredId(null)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-10 pb-6">
            <button className="w-8 h-8 rounded-full border border-gray-900 flex items-center justify-center text-sm font-medium">
              1
            </button>
            <button className="w-8 h-8 rounded-full hover:border border-gray-300 flex items-center justify-center text-sm text-gray-600">
              2
            </button>
            <button className="w-8 h-8 rounded-full hover:border border-gray-300 flex items-center justify-center text-sm text-gray-600">
              3
            </button>
            <span className="text-gray-400 px-1">...</span>
            <button className="w-8 h-8 rounded-full hover:border border-gray-300 flex items-center justify-center text-sm text-gray-600">
              →
            </button>
          </div>
        </div>

        {/* Right: map — sticky on desktop */}
        <div className="hidden lg:block lg:w-[45%] xl:w-[42%] sticky top-[130px] h-[calc(100vh-130px)]">
          <ExploreMap
            providers={providers}
            hoveredId={hoveredId}
            onMarkerHover={setHoveredId}
            onMarkerLeave={() => setHoveredId(null)}
          />
        </div>
      </div>
    </div>
  );
}
