import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { OrderValidationError } from "@/lib/orders/errors";
import { parseReportsRequest } from "@/lib/validators/report";

const now = new Date("2026-08-28T18:00:00.000Z");

describe("parseReportsRequest F10", () => {
  it("rejects grain + from together", () => {
    expect(() =>
      parseReportsRequest(
        { grain: "month", date: "2026-08", from: "2026-08-01", to: "2026-08-31" },
        now
      )
    ).toThrow(OrderValidationError);
  });

  it("rejects from > to", () => {
    try {
      parseReportsRequest(
        { grain: null, date: null, from: "2026-08-10", to: "2026-08-01" },
        now
      );
      expect.fail("expected error");
    } catch (err) {
      expect(err).toBeInstanceOf(OrderValidationError);
      expect((err as OrderValidationError).details?.[0].field).toBe("from");
    }
  });

  it("rejects span 367 days", () => {
    try {
      parseReportsRequest(
        { grain: null, date: null, from: "2025-08-01", to: "2026-08-02" },
        now
      );
      expect.fail("expected error");
    } catch (err) {
      expect(err).toBeInstanceOf(OrderValidationError);
      expect((err as OrderValidationError).details?.[0].field).toBe("to");
    }
  });

  it("accepts a valid range", () => {
    const parsed = parseReportsRequest(
      { grain: null, date: null, from: "2026-08-01", to: "2026-08-28", productIds: ["quickSale"] },
      now
    );
    expect(parsed).toEqual({
      mode: "range",
      from: "2026-08-01",
      to: "2026-08-28",
      productIds: ["quickSale"],
    });
  });

  it("keeps F6 grain mode", () => {
    const parsed = parseReportsRequest(
      { grain: "day", date: "2026-08-16", from: null, to: null },
      now
    );
    expect(parsed.mode).toBe("grain");
  });

  it("still rejects invalid grain via Zod", () => {
    expect(() =>
      parseReportsRequest({ grain: "week", date: "2026-08", from: null, to: null }, now)
    ).toThrow(ZodError);
  });
});
