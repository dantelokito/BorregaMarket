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
      return;
    }
    const el = noticeRef.current;
    if (!el) return;
    const publish = () => {
      root.style.setProperty("--cookie-notice-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--cookie-notice-h");
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
      className={`no-print fixed z-50 rounded-xl border border-gray-200 bg-white p-4 shadow-lg inset-x-3 bottom-[calc(var(--sticky-cta-h,0px)+0.75rem)] sm:inset-x-auto sm:right-4 sm:max-w-md ${
        leaving ? "opacity-0 transition-opacity duration-150 motion-reduce:transition-none" : ""
      }`}
    >
      <p className="text-sm text-slate-700">
        Usamos solo cookies necesarias para tu sesión y una medición anónima de uso, sin cookies ni
        datos personales.{" "}
        <Link
          href="/legal/cookies"
          className="underline underline-offset-2 hover:text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Política de Cookies
        </Link>
      </p>
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
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
  );
}
