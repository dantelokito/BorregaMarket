"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { getAuthSession, SESSION_THEME_EVENT } from "@/lib/api/auth";
import { darkenHex } from "@/lib/color/contrast";

const PLATFORM = {
  brand: "#e23744",
  brandDark: "#c13515",
  brandLight: "#ff5a5f",
  brandSecondary: "#c13515",
};

function applyPlatform() {
  const root = document.documentElement;
  root.style.setProperty("--brand", PLATFORM.brand);
  root.style.setProperty("--brand-dark", PLATFORM.brandDark);
  root.style.setProperty("--brand-light", PLATFORM.brandLight);
  root.style.setProperty("--brand-secondary", PLATFORM.brandSecondary);
}

export function SessionThemeProvider({ children }: { children: ReactNode }) {
  const hydrate = useCallback(async () => {
    const session = await getAuthSession();
    if (session.role === "PROVIDER" && session.brand) {
      const root = document.documentElement;
      root.style.setProperty("--brand", session.brand.primaryColor);
      root.style.setProperty("--brand-dark", darkenHex(session.brand.primaryColor));
      root.style.setProperty("--brand-secondary", session.brand.secondaryColor);
    } else {
      applyPlatform();
    }
  }, []);

  useEffect(() => {
    void hydrate();
    window.addEventListener(SESSION_THEME_EVENT, hydrate);
    return () => window.removeEventListener(SESSION_THEME_EVENT, hydrate);
  }, [hydrate]);

  return <>{children}</>;
}
