"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useMeasurement } from "./MeasurementProvider";

export function CookieNotice() {
  const { hydrated, preference, choose } = useMeasurement();
  const { showToast } = useToast();
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const open = hydrated && preference === "absent" && !hidden;

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!open) {
      root.style.removeProperty("--cookie-notice-h");
      root.style.removeProperty("--cookie-notice-offset");
      return;
    }
    const el = noticeRef.current;
    if (!el) return;
    const publish = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      root.style.setProperty("--cookie-notice-h", `${height}px`);
      root.style.setProperty("--cookie-notice-offset", `${height + 12}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--cookie-notice-h");
      root.style.removeProperty("--cookie-notice-offset");
    };
  }, [open]);

  if (!open) return null;

  function dismiss(next: "on" | "off") {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      choose(next);
      setHidden(true);
      if (next === "off") showToast("Medición desactivada");
    };
    if (reduce) {
      finish();
      return;
    }
    setLeaving(true);
    window.setTimeout(finish, 150);
  }

  return (
    <div
      ref={noticeRef}
      data-cookie-notice
      role="region"
      aria-label="Aviso de cookies y medición"
      className={`no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.06)] ${
        leaving ? "opacity-0 transition-opacity duration-150 motion-reduce:transition-none" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <p className="text-sm text-slate-700">
          Usamos solo cookies necesarias para tu sesión y una medición anónima de uso, sin cookies ni
          datos personales.{" "}
          <Link
            href="/legal/cookies"
            className="pointer-events-auto underline underline-offset-2 hover:text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Política de Cookies
          </Link>
        </p>
        <div className="pointer-events-auto flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => dismiss("off")}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
        >
          Desactivar medición
        </button>
        <button
          type="button"
          onClick={() => dismiss("on")}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
        >
          Entendido
        </button>
        </div>
      </div>
    </div>
  );
}
