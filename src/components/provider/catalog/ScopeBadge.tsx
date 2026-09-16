"use client";

import { Globe, Store } from "lucide-react";
import type { ProductScope } from "@/lib/api/types";

export function ScopeBadge({ scope }: { scope?: ProductScope }) {
  if (scope === "LOCAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
        <Store size={12} aria-hidden />
        LOCAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-900">
      <Globe size={12} aria-hidden />
      GLOBAL
    </span>
  );
}
