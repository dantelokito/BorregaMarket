import {
  DASHBOARD_TZ,
  isReportPeriodInFuture,
  ymdInTimeZone,
  type ReportGrain,
} from "@/lib/timezone";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type DashboardView = "resumen" | "reportes";

export function parseDashboardView(raw: string | null): DashboardView {
  return raw === "reportes" ? "reportes" : "resumen";
}

export function parseReportGrain(raw: string | null): ReportGrain {
  if (raw === "day" || raw === "month" || raw === "year") return raw;
  return "month";
}

export function currentDateForGrain(grain: ReportGrain, now: Date = new Date()): string {
  const today = ymdInTimeZone(now);
  if (grain === "day") return today;
  if (grain === "month") return today.slice(0, 7);
  return today.slice(0, 4);
}

export function dateFitsGrain(grain: ReportGrain, date: string): boolean {
  if (grain === "day") return /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (grain === "month") return /^\d{4}-\d{2}$/.test(date);
  return /^\d{4}$/.test(date);
}

export function resolveReportDate(
  grain: ReportGrain,
  date: string | null,
  now: Date = new Date()
): string {
  if (date && dateFitsGrain(grain, date) && !isReportPeriodInFuture(grain, date, now)) {
    return date;
  }
  return currentDateForGrain(grain, now);
}

export function formatReportPeriodLabel(grain: ReportGrain, date: string): string {
  if (grain === "year") return date;
  if (grain === "month") {
    const month = Number(date.slice(5, 7));
    return `${MONTHS_ES[month - 1] ?? date} ${date.slice(0, 4)}`;
  }
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: DASHBOARD_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(utc);
}

export function formatGeneratedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: DASHBOARD_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function yearOptions(now: Date = new Date()): string[] {
  const current = Number(ymdInTimeZone(now).slice(0, 4));
  const start = Math.min(2024, current);
  const years: string[] = [];
  for (let year = current; year >= start; year -= 1) {
    years.push(String(year));
  }
  return years;
}

export function maxDateForGrain(grain: ReportGrain, now: Date = new Date()): string {
  return currentDateForGrain(grain, now);
}
