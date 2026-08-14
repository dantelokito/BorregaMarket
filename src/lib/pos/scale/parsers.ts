import type { ScaleParseResult } from "@/lib/pos/scale/types";

const WEIGHT_RE =
  /([+-]?\s*\d+(?:[.,]\d+)?)\s*(kg|kgs|kilogramos?|g|gr|gramos?)?/i;

export class LineBuffer {
  private buffer = "";

  push(text: string): string[] {
    this.buffer += text;
    const lines: string[] = [];
    while (true) {
      const crlf = this.buffer.indexOf("\r\n");
      const lf = this.buffer.indexOf("\n");
      const cr = this.buffer.indexOf("\r");
      const candidates = [crlf, lf, cr].filter((i) => i >= 0);
      if (candidates.length === 0) break;
      const idx = Math.min(...candidates);
      const sepLen = crlf === idx ? 2 : 1;
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + sepLen);
      if (line.trim().length > 0) lines.push(line);
    }
    return lines;
  }

  reset() {
    this.buffer = "";
  }
}

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(/\s+/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function toGrams(value: number, unit: string | undefined): number {
  const u = (unit ?? "kg").toLowerCase();
  if (u === "g" || u === "gr" || u.startsWith("gramo")) return value;
  return value * 1000;
}

/** Parse a complete scale line. Invalid / empty → null. */
export function parseGenericStableLine(line: string): ScaleParseResult {
  const trimmed = line.replace(/\0/g, "").trim();
  if (!trimmed) return null;
  if (/^US\b/i.test(trimmed)) return null;
  const match = trimmed.match(WEIGHT_RE);
  if (!match) return null;
  const value = toNumber(match[1] ?? "");
  if (value === null) return null;
  const grams = toGrams(value, match[2]);
  if (!Number.isFinite(grams) || grams < 0) return null;
  return { grams: Math.round(grams * 1000) / 1000 };
}

export function parseGenericStableChunk(chunk: Uint8Array): ScaleParseResult {
  const text = new TextDecoder().decode(chunk);
  return parseGenericStableLine(text);
}
