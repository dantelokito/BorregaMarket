import { describe, expect, it } from "vitest";
import {
  colonyFromAddress,
  shouldShowGlobalReports,
  shouldShowProviderSwitcher,
} from "@/lib/ui/provider-label";

describe("provider-label F11", () => {
  it("extrae colonia del penúltimo segmento", () => {
    expect(colonyFromAddress("Av. Constitución 1200, Centro, Monterrey")).toBe("Centro");
    expect(colonyFromAddress("Av. Eugenio Garza Sada 2501, Tecnológico, Monterrey")).toBe(
      "Tecnológico"
    );
  });

  it("muestra switcher y reportes globales solo si N>1", () => {
    expect(shouldShowProviderSwitcher(1)).toBe(false);
    expect(shouldShowGlobalReports(1)).toBe(false);
    expect(shouldShowProviderSwitcher(2)).toBe(true);
    expect(shouldShowGlobalReports(2)).toBe(true);
  });
});
