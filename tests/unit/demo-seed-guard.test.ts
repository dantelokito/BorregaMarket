import { describe, expect, it } from "vitest";
import { isDemoSeedAllowed } from "@/lib/seed/demo-guard";

describe("isDemoSeedAllowed", () => {
  it("allows seed outside production", () => {
    expect(isDemoSeedAllowed("development", undefined)).toBe(true);
    expect(isDemoSeedAllowed("test", undefined)).toBe(true);
  });

  it("blocks seed in production unless ALLOW_DEMO_SEED=true", () => {
    expect(isDemoSeedAllowed("production", undefined)).toBe(false);
    expect(isDemoSeedAllowed("production", "false")).toBe(false);
    expect(isDemoSeedAllowed("production", "true")).toBe(true);
  });
});
