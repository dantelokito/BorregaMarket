const TZ = "America/Monterrey";

export function formatLegalDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function monterreyYear(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(now);
}

export function formatMxPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return phone;
  return `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
}
