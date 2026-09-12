"use client";

import type { ReactNode } from "react";
import { useProviderScope } from "@/hooks/useProviderScope";

/** Remonta CAT/POS/DASH F10 al cambiar sucursal activa (sin redibujar layouts). */
export function ProviderPanelBody({ children }: { children: ReactNode }) {
  const { activeProviderId } = useProviderScope();
  return <div key={activeProviderId ?? "none"}>{children}</div>;
}
