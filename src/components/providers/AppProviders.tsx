"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { SessionThemeProvider } from "@/components/providers/SessionThemeProvider";
import { ProviderScopeProvider } from "@/hooks/useProviderScope";
import { MeasurementProvider } from "@/components/legal/MeasurementProvider";
import { MeasurementPreferencesDialog } from "@/components/legal/MeasurementPreferences";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { ReconsentDialog } from "@/components/legal/ReconsentDialog";
import { UmamiScript } from "@/components/analytics/UmamiScript";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionThemeProvider>
      <ToastProvider>
        <MeasurementProvider>
          <ProviderScopeProvider>
            {children}
            <ReconsentDialog />
            <MeasurementPreferencesDialog />
            <CookieNotice />
            <UmamiScript />
          </ProviderScopeProvider>
        </MeasurementProvider>
      </ToastProvider>
    </SessionThemeProvider>
  );
}
