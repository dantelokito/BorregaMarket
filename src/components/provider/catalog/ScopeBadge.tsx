"use client";

import { Store } from "lucide-react";
import type { ProductScope } from "@/lib/api/types";

export function ScopeBadge({ scope }: { scope?: ProductScope }) {
  if (scope === "LOCAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
        <Store size={12} aria-hidden />
        Solo este negocio
      </span>
    );
  }
  return <span className="text-xs text-slate-500">Catálogo</span>;
}
