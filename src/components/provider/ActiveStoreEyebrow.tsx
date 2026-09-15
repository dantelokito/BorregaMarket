"use client";

import { useProviderScope } from "@/hooks/useProviderScope";

export function ActiveStoreEyebrow() {
  const { activeName, status } = useProviderScope();
  if (status === "loading" && !activeName) {
    return (
      <p className="mb-2 h-5 w-48 animate-pulse rounded bg-slate-200" aria-hidden />
    );
  }
  if (!activeName) return null;
  return (
    <p className="mb-1 text-sm text-slate-500">
      <span className="sr-only">Frutería activa: </span>
      <span className="font-medium text-slate-900">{activeName}</span>
    </p>
  );
}
