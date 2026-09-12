import { describe, expect, it } from "vitest";
import { getScrollbarGutter, isPointerOnScrollbar } from "@/lib/scroll-gutter";

function mockScrollEl(
  offsetWidth: number,
  clientWidth: number,
  rectRight: number
): Pick<HTMLElement, "offsetWidth" | "clientWidth" | "getBoundingClientRect"> {
  return {
    offsetWidth,
    clientWidth,
    getBoundingClientRect: () =>
      ({
        right: rectRight,
      }) as DOMRect,
  };
}

describe("getScrollbarGutter", () => {
  it("returns 0 when no scrollbar gutter is reserved", () => {
    expect(getScrollbarGutter({ offsetWidth: 400, clientWidth: 400 })).toBe(0);
  });

  it("returns the difference between offset and client width", () => {
    expect(getScrollbarGutter({ offsetWidth: 400, clientWidth: 385 })).toBe(15);
  });
});

describe("isPointerOnScrollbar", () => {
  it("returns false when gutter is 0", () => {
    const el = mockScrollEl(400, 400, 800);
    expect(isPointerOnScrollbar(el, { clientX: 799 })).toBe(false);
  });

  it("returns true when pointer is in the scrollbar gutter", () => {
    const el = mockScrollEl(400, 385, 800);
    expect(isPointerOnScrollbar(el, { clientX: 790 })).toBe(true);
    expect(isPointerOnScrollbar(el, { clientX: 785 })).toBe(true);
  });

  it("returns false when pointer is in the content area", () => {
    const el = mockScrollEl(400, 385, 800);
    expect(isPointerOnScrollbar(el, { clientX: 700 })).toBe(false);
    expect(isPointerOnScrollbar(el, { clientX: 784 })).toBe(false);
  });
});
