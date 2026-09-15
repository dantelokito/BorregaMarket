import { describe, expect, it } from "vitest";
import {
  mineProvidersFromSession,
  shouldRetryScopeSession,
  shouldShowGlobalReports,
  shouldShowProviderSwitcher,
} from "@/lib/ui/provider-label";

describe("provider scope desde session F11", () => {
  it("N=2 desde providers[] de session muestra switcher y reportes", () => {
    const providers = mineProvidersFromSession({
      providers: [
        { id: "a", businessName: "Frutas El Paraíso" },
        { id: "b", businessName: "El Paraíso Tecnológico" },
      ],
    });
    expect(providers).toHaveLength(2);
    expect(shouldShowProviderSwitcher(providers.length)).toBe(true);
    expect(shouldShowGlobalReports(providers.length)).toBe(true);
  });

  it("N=1 (Campo Verde) no muestra chrome F11", () => {
    const providers = mineProvidersFromSession({
      providers: [{ id: "c", businessName: "Campo Verde" }],
    });
    expect(shouldShowProviderSwitcher(providers.length)).toBe(false);
    expect(shouldShowGlobalReports(providers.length)).toBe(false);
  });

  it("session vacía no inventa sucursales (sin mock)", () => {
    expect(mineProvidersFromSession({})).toEqual([]);
    expect(shouldRetryScopeSession({ authenticated: false, role: null })).toBe(true);
    expect(shouldRetryScopeSession({ authenticated: true, role: "PROVIDER" })).toBe(false);
  });
});
