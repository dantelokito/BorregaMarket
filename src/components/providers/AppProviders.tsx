"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { SessionThemeProvider } from "@/components/providers/SessionThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionThemeProvider>
  );
}
