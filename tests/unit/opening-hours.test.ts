import { describe, expect, it } from "vitest";
import { computeIsOpenNow } from "@/lib/providers/opening-hours";

const tue0900Mty = new Date(Date.UTC(2026, 7, 18, 15, 0, 0));
const tue0100UtcWed = new Date(Date.UTC(2026, 7, 19, 1, 0, 0));

describe("computeIsOpenNow (America/Monterrey)", () => {
  it("returns null when hours are not published", () => {
    expect(computeIsOpenNow(null, tue0900Mty)).toBeNull();
    expect(computeIsOpenNow([], tue0900Mty)).toBeNull();
  });

  it("returns true inside published hours", () => {
    expect(
      computeIsOpenNow(
        [{ day: 2, open: "08:00", close: "18:00", closed: false }],
        tue0900Mty
      )
    ).toBe(true);
  });

  it("returns false after close", () => {
    expect(
      computeIsOpenNow(
        [{ day: 2, open: "08:00", close: "18:00", closed: false }],
        tue0100UtcWed
      )
    ).toBe(false);
  });

  it("returns false when the weekday is marked closed", () => {
    expect(
      computeIsOpenNow(
        [{ day: 2, open: null, close: null, closed: true }],
        tue0900Mty
      )
    ).toBe(false);
  });
});
