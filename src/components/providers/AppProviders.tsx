"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { SessionThemeProvider } from "@/components/providers/SessionThemeProvider";
import { ProviderScopeProvider } from "@/hooks/useProviderScope";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionThemeProvider>
      <ToastProvider>
        <ProviderScopeProvider>{children}</ProviderScopeProvider>
      </ToastProvider>
    </SessionThemeProvider>
  );
}
