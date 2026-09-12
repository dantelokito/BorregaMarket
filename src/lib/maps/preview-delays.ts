export const PREVIEW_OPEN_DELAY_MS = 300;
export const PREVIEW_CLOSE_DELAY_MS = 150;
export const PREVIEW_LONG_PRESS_MS = 500;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function previewDelays(reducedMotion = prefersReducedMotion()): {
  open: number;
  close: number;
  longPress: number;
} {
  if (reducedMotion) return { open: 0, close: 0, longPress: 0 };
  return {
    open: PREVIEW_OPEN_DELAY_MS,
    close: PREVIEW_CLOSE_DELAY_MS,
    longPress: PREVIEW_LONG_PRESS_MS,
  };
}
