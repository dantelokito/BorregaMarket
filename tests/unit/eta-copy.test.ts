import { describe, expect, it } from "vitest";
import { etaChipLabel } from "@/lib/ui/eta-copy";

describe("eta copy", () => {
  it("uses prep-only copy", () => {
    expect(etaChipLabel("eta_prep_only", 20)).toBe("Tiempo de preparación: ~20 min");
  });

  it("uses ready-approx copy", () => {
    expect(etaChipLabel("eta_ready_approx", 35)).toBe("Listo aprox. en ~35 min");
  });
});
