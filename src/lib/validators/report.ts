import { z } from "zod";
import { OrderValidationError } from "@/lib/orders/errors";
import {
  isReportPeriodInFuture,
  type ReportGrain,
  ymdInTimeZone,
} from "@/lib/timezone";

function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function isValidYearMonth(yyyyMm: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return false;
  const month = Number(yyyyMm.slice(5, 7));
  return month >= 1 && month <= 12;
}

export const reportQuerySchema = z
  .object({
    grain: z.enum(["day", "month", "year"], {
      required_error: "Requerido",
      invalid_type_error: "Debe ser day, month o year",
    }),
    date: z
      .string({ required_error: "Requerido", invalid_type_error: "Requerido" })
      .min(1, "Requerido"),
  })
  .superRefine((value, ctx) => {
    if (value.grain === "day" && !isValidYmd(value.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Formato inválido para grain=day",
      });
    }
    if (value.grain === "month" && !isValidYearMonth(value.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Formato inválido para grain=month",
      });
    }
    if (value.grain === "year" && !/^\d{4}$/.test(value.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Formato inválido para grain=year",
      });
    }
  });

export type ReportQuery = { grain: ReportGrain; date: string };

export type ReportRangeQuery = {
  mode: "range";
  from: string;
  to: string;
  productIds: string[];
};

export type ReportRequest =
  | ({ mode: "grain" } & ReportQuery)
  | ReportRangeQuery;

function inclusiveDaySpan(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function parseReportsRequest(
  raw: {
    grain: string | null;
    date: string | null;
    from: string | null;
    to: string | null;
    productIds?: string[];
  },
  now: Date = new Date()
): ReportRequest {
  const hasGrain = Boolean(raw.grain || raw.date);
  const hasRange = Boolean(raw.from || raw.to);

  if (hasGrain && hasRange) {
    throw new OrderValidationError("Validation failed", [
      { field: "from", message: "No combines from/to con grain/date" },
    ]);
  }

  if (hasRange) {
    if (!raw.from || !raw.to) {
      throw new OrderValidationError("Validation failed", [
        { field: raw.from ? "to" : "from", message: "from y to son requeridos" },
      ]);
    }
    if (!isValidYmd(raw.from)) {
      throw new OrderValidationError("Validation failed", [
        { field: "from", message: "Formato inválido" },
      ]);
    }
    if (!isValidYmd(raw.to)) {
      throw new OrderValidationError("Validation failed", [
        { field: "to", message: "Formato inválido" },
      ]);
    }
    if (raw.from > raw.to) {
      throw new OrderValidationError("Validation failed", [
        { field: "from", message: "from no puede ser posterior a to" },
      ]);
    }
    const span = inclusiveDaySpan(raw.from, raw.to);
    if (span > 366) {
      throw new OrderValidationError("Validation failed", [
        { field: "to", message: "El rango no puede superar 366 días" },
      ]);
    }
    const today = ymdInTimeZone(now);
    if (raw.from > today || raw.to > today) {
      throw new OrderValidationError("Validation failed", [
        { field: raw.to > today ? "to" : "from", message: "El periodo no puede ser futuro" },
      ]);
    }
    return {
      mode: "range",
      from: raw.from,
      to: raw.to,
      productIds: (raw.productIds ?? []).filter(Boolean),
    };
  }

  const grain = parseReportQuery({ grain: raw.grain, date: raw.date }, now);
  return { mode: "grain", ...grain };
}

export function parseReportQuery(
  raw: { grain: string | null; date: string | null },
  now: Date = new Date()
): ReportQuery {
  const parsed = reportQuerySchema.parse({
    grain: raw.grain ?? undefined,
    date: raw.date ?? undefined,
  });
  if (isReportPeriodInFuture(parsed.grain, parsed.date, now)) {
    throw new OrderValidationError("Validation failed", [
      { field: "date", message: "El periodo no puede ser futuro" },
    ]);
  }
  return parsed;
}
