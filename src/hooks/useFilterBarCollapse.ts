"use client";

import { isPointerOnScrollbar } from "@/lib/scroll-gutter";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type FilterBarPhase = "expanded" | "collapsing" | "collapsed" | "expanding";

const COLLAPSE_MIN_SCROLL = 80;
const EXPAND_NEAR_TOP = 16;
const SCROLL_DELTA_MIN = 6;
const COLLAPSE_ACCUM = 48;
const TRANSITION_MS = 300;
const TRANSITION_FALLBACK_MS = 350;

function layoutClassByPhase(phase: FilterBarPhase): string {
  switch (phase) {
    case "collapsing":
      return "explore-filterbar-layout--collapsing explore-filterbar-layout--collapsed";
    case "collapsed":
      return "explore-filterbar-layout--collapsed";
    case "expanding":
      return "explore-filterbar-layout--expanding";
    default:
      return "";
  }
}

export function useFilterBarCollapse(
  scrollRef: RefObject<HTMLDivElement | null>,
  layoutRef: RefObject<HTMLDivElement | null>
) {
  const [phase, setPhase] = useState<FilterBarPhase>("expanded");
  const phaseRef = useRef<FilterBarPhase>("expanded");
  const lastScrollTopRef = useRef(0);
  const scrollDownAccumRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutHeightRef = useRef(0);
  const scrollbarDraggingRef = useRef(false);
  const pendingCompensationRef = useRef(false);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const setPhaseSafe = useCallback((next: FilterBarPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const captureLayoutHeight = useCallback(() => {
    const el = layoutRef.current;
    if (el) {
      layoutHeightRef.current = el.getBoundingClientRect().height;
    }
  }, [layoutRef]);

  const applyScrollCompensation = useCallback(() => {
    const scrollEl = scrollRef.current;
    const layoutEl = layoutRef.current;
    if (!scrollEl || !layoutEl) return;

    const heightAfter = layoutEl.getBoundingClientRect().height;
    const delta = layoutHeightRef.current - heightAfter;
    if (delta !== 0) {
      scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop + delta);
      lastScrollTopRef.current = scrollEl.scrollTop;
    }
  }, [scrollRef, layoutRef]);

  const compensateScroll = useCallback(() => {
    if (scrollbarDraggingRef.current) {
      pendingCompensationRef.current = true;
      return;
    }
    applyScrollCompensation();
  }, [applyScrollCompensation]);

  const finishCollapsing = useCallback(() => {
    clearFallback();
    compensateScroll();
    setPhaseSafe("collapsed");
  }, [clearFallback, compensateScroll, setPhaseSafe]);

  const finishExpanding = useCallback(() => {
    clearFallback();
    compensateScroll();
    setPhaseSafe("expanded");
  }, [clearFallback, compensateScroll, setPhaseSafe]);

  const startCollapse = useCallback(() => {
    if (phaseRef.current !== "expanded") return;
    clearFallback();
    captureLayoutHeight();
    setPhaseSafe("collapsing");
    fallbackTimerRef.current = setTimeout(() => {
      if (phaseRef.current === "collapsing") {
        finishCollapsing();
      }
    }, TRANSITION_FALLBACK_MS);
  }, [clearFallback, captureLayoutHeight, setPhaseSafe, finishCollapsing]);

  const startExpand = useCallback(() => {
    if (phaseRef.current !== "collapsed") return;
    clearFallback();
    captureLayoutHeight();
    scrollDownAccumRef.current = 0;
    setPhaseSafe("expanding");
    fallbackTimerRef.current = setTimeout(() => {
      if (phaseRef.current === "expanding") {
        finishExpanding();
      }
    }, TRANSITION_FALLBACK_MS);
  }, [clearFallback, captureLayoutHeight, setPhaseSafe, finishExpanding]);

  const onLayoutTransitionEnd = useCallback(() => {
    if (phaseRef.current === "collapsing") {
      finishCollapsing();
    } else if (phaseRef.current === "expanding") {
      finishExpanding();
    }
  }, [finishCollapsing, finishExpanding]);

  const expand = useCallback(() => {
    startExpand();
  }, [startExpand]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    lastScrollTopRef.current = el.scrollTop;

    const onPointerDown = (e: PointerEvent) => {
      if (isPointerOnScrollbar(el, e)) {
        scrollbarDraggingRef.current = true;
      }
    };

    const onPointerEnd = () => {
      if (!scrollbarDraggingRef.current) return;

      scrollbarDraggingRef.current = false;
      scrollDownAccumRef.current = 0;

      const scrollTop = el.scrollTop;
      lastScrollTopRef.current = scrollTop;

      if (pendingCompensationRef.current) {
        pendingCompensationRef.current = false;
        applyScrollCompensation();
      }

      if (scrollTop <= EXPAND_NEAR_TOP && phaseRef.current === "collapsed") {
        startExpand();
      }
    };

    const onScroll = () => {
      if (scrollbarDraggingRef.current) return;
      if (rafIdRef.current != null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        const currentPhase = phaseRef.current;
        if (currentPhase === "collapsing" || currentPhase === "expanding") return;

        const scrollTop = el.scrollTop;
        const delta = scrollTop - lastScrollTopRef.current;
        lastScrollTopRef.current = scrollTop;

        if (Math.abs(delta) < SCROLL_DELTA_MIN) return;

        if (scrollTop <= EXPAND_NEAR_TOP) {
          scrollDownAccumRef.current = 0;
          if (currentPhase === "collapsed") {
            startExpand();
          }
          return;
        }

        if (delta > 0) {
          scrollDownAccumRef.current += delta;
        } else {
          scrollDownAccumRef.current = 0;
        }

        if (
          currentPhase === "expanded" &&
          scrollTop > COLLAPSE_MIN_SCROLL &&
          scrollDownAccumRef.current >= COLLAPSE_ACCUM
        ) {
          scrollDownAccumRef.current = 0;
          startCollapse();
        }
      });
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("scroll", onScroll);
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      clearFallback();
    };
  }, [scrollRef, startCollapse, startExpand, clearFallback, applyScrollCompensation]);

  const shellCollapsed = phase === "collapsed" || phase === "collapsing";
  const pillVisible = phase === "collapsed";

  return {
    phase,
    layoutClassName: layoutClassByPhase(phase),
    layoutCollapsed: phase === "collapsed",
    shellCollapsed,
    pillVisible,
    animating: phase === "collapsing" || phase === "expanding",
    expand,
    onLayoutTransitionEnd,
    transitionMs: TRANSITION_MS,
  };
}
