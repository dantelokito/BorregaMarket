"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Publica la altura de una barra fija inferior para que el aviso de cookies no la tape. */
export function useStickyCtaHeight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => {
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      if (!mobile) {
        root.style.removeProperty("--sticky-cta-h");
        return;
      }
      root.style.setProperty("--sticky-cta-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    const mq = window.matchMedia("(max-width: 1023px)");
    mq.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", apply);
      root.style.removeProperty("--sticky-cta-h");
    };
  }, [ref]);
}
