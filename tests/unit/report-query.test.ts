import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { OrderValidationError } from "@/lib/orders/errors";
import { parseReportQuery } from "@/lib/validators/report";

const now = new Date("2026-08-16T18:00:00.000Z");

describe("parseReportQuery", () => {
  it("accepts the three grains with matching date shapes", () => {
    expect(parseReportQuery({ grain: "day", date: "2026-08-16" }, now)).toEqual({
      grain: "day",
      date: "2026-08-16",
    });
    expect(parseReportQuery({ grain: "month", date: "2026-08" }, now).grain).toBe("month");
    expect(parseReportQuery({ grain: "year", date: "2026" }, now).date).toBe("2026");
  });

  it("rejects mismatched grain/date formats", () => {
    expect(() => parseReportQuery({ grain: "month", date: "2026-08-16" }, now)).toThrow(ZodError);
    expect(() => parseReportQuery({ grain: "day", date: "2026-08" }, now)).toThrow(ZodError);
    expect(() => parseReportQuery({ grain: "year", date: "26" }, now)).toThrow(ZodError);
  });

  it("rejects a strictly future period with 400-style OrderValidationError", () => {
    expect(() => parseReportQuery({ grain: "day", date: "2026-08-17" }, now)).toThrow(
      OrderValidationError
    );
    try {
      parseReportQuery({ grain: "month", date: "2026-09" }, now);
    } catch (err) {
      expect(err).toBeInstanceOf(OrderValidationError);
      expect((err as OrderValidationError).details).toEqual([
        { field: "date", message: "El periodo no puede ser futuro" },
      ]);
    }
  });
});
