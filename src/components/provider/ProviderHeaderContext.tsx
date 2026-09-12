"use client";

import { useProviderScope } from "@/hooks/useProviderScope";
import { ProviderSwitcher } from "./ProviderSwitcher";

export function ProviderHeaderContext() {
  const { showSwitcher, activeName, status } = useProviderScope();
  if (showSwitcher) return <ProviderSwitcher />;
  if (status === "loading" && !activeName) {
    return <span className="hidden h-5 w-36 animate-pulse rounded bg-slate-200 sm:inline-block" />;
  }
  if (!activeName) return null;
  return (
    <p className="hidden truncate text-sm font-medium text-slate-800 sm:block">{activeName}</p>
  );
}
