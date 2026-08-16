/** WCAG 2.1 relative luminance and contrast vs white (ADR-021). */

const HEX_RRGGBB = /^#([0-9A-Fa-f]{6})$/;
const WHITE = "#FFFFFF";

export const PRIMARY_MIN_CONTRAST = 4.5;
export const SECONDARY_MIN_CONTRAST = 3;

export const BRAND_PAIR_MESSAGE =
  "Debes indicar primario y secundario, o restablecer ambos";
export const PRIMARY_CONTRAST_MESSAGE =
  "El color primario no tiene contraste suficiente para texto blanco (WCAG AA 4.5:1)";
export const SECONDARY_CONTRAST_MESSAGE =
  "El color secundario no tiene contraste suficiente para acentos (mínimo 3:1 sobre blanco)";
export const HEX_FORMAT_MESSAGE = "Debe ser un color hex #RRGGBB";

export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX_RRGGBB.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function canonicalizeHex(hex: string): string | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

export function contrastRatio(hexA: string, hexB: string): number | null {
  const first = relativeLuminance(hexA);
  const second = relativeLuminance(hexB);
  if (first === null || second === null) return null;
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastVsWhite(hex: string): number | null {
  return contrastRatio(hex, WHITE);
}

export function isPrimaryContrastValid(hex: string): boolean {
  const ratio = contrastVsWhite(hex);
  return ratio !== null && ratio >= PRIMARY_MIN_CONTRAST;
}

export function isSecondaryContrastValid(hex: string): boolean {
  const ratio = contrastVsWhite(hex);
  return ratio !== null && ratio >= SECONDARY_MIN_CONTRAST;
}

export function isBrandPairValid(
  primary: string | null | undefined,
  secondary: string | null | undefined
): boolean {
  if (!primary || !secondary) return false;
  const canonicalPrimary = canonicalizeHex(primary);
  const canonicalSecondary = canonicalizeHex(secondary);
  if (!canonicalPrimary || !canonicalSecondary) return false;
  return (
    isPrimaryContrastValid(canonicalPrimary) &&
    isSecondaryContrastValid(canonicalSecondary)
  );
}

export function isValidHex(value: string): boolean {
  return parseHexRgb(value) !== null;
}

export function darkenHex(hex: string, amount = 0.12): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const channel = (n: number) =>
    Math.max(0, Math.round(n * (1 - amount)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}
