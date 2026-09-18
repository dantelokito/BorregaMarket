/** Solo http(s). Evita javascript:/data: en href (CodeQL js/xss). */
export function safeHttpHref(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}
