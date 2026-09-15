import { Suspense } from "react";
import { GlobalReportsPageClient } from "./GlobalReportsPageClient";

export default function GlobalReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      }
    >
      <GlobalReportsPageClient />
    </Suspense>
  );
}
