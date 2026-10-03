"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Publica la altura de una barra inferior visible para que el aviso de cookies no la tape. */
export function useStickyCtaHeight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;

    const apply = () => {
      const rect = el.getBoundingClientRect();
      const hidden = rect.width < 1 || rect.height < 1;
      const measuredNotice = Number.parseFloat(root.style.getPropertyValue("--cookie-notice-h"));
      const band = (Number.isFinite(measuredNotice) && measuredNotice > 0 ? measuredNotice : 168) + 12;
      const gapBelow = window.innerHeight - rect.bottom;
      if (hidden || gapBelow >= band) {
        root.style.removeProperty("--sticky-cta-h");
        return;
      }
      const lift = Math.ceil(window.innerHeight - Math.max(rect.top, 0) - 12);
      if (lift < 1) {
        root.style.removeProperty("--sticky-cta-h");
        return;
      }
      root.style.setProperty("--sticky-cta-h", `${lift}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    const styleObserver = new MutationObserver(apply);
    styleObserver.observe(root, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, true);
    return () => {
      observer.disconnect();
      styleObserver.disconnect();
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, true);
      root.style.removeProperty("--sticky-cta-h");
    };
  }, [ref]);
}
