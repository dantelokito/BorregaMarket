export function getScrollbarGutter(el: Pick<HTMLElement, "offsetWidth" | "clientWidth">): number {
  return Math.max(0, el.offsetWidth - el.clientWidth);
}

export function isPointerOnScrollbar(
  el: Pick<HTMLElement, "offsetWidth" | "clientWidth" | "getBoundingClientRect">,
  e: Pick<PointerEvent, "clientX">
): boolean {
  const gutter = getScrollbarGutter(el);
  if (gutter <= 0) return false;
  const rect = el.getBoundingClientRect();
  return e.clientX >= rect.right - gutter;
}
