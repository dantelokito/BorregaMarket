"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useProviderScope } from "@/hooks/useProviderScope";
import { colonyFromAddress } from "@/lib/ui/provider-label";

export function ProviderSwitcher() {
  const { status, showSwitcher, providers, activeProviderId, activeName, switching, switchTo } =
    useProviderScope();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!showSwitcher) return null;

  const loading = status === "loading";
  const label = activeName || "Frutería activa";

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-auto sm:min-w-[220px]">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Frutería activa"
        aria-busy={loading || switching || undefined}
        disabled={switching}
        onClick={() => {
          if (loading) return;
          setOpen((v) => !v);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60"
      >
        {loading && !activeName ? (
          <span className="inline-block h-4 w-[120px] animate-pulse rounded bg-slate-200" />
        ) : (
          <span className="truncate font-medium">{label}</span>
        )}
        <ChevronDown size={16} aria-hidden className="shrink-0 text-slate-500" />
      </button>
      {open && !loading && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tus fruterías"
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {providers.map((p) => {
            const selected = p.id === activeProviderId;
            const colony = colonyFromAddress(p.address);
            return (
              <li key={p.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={switching}
                  onClick={async () => {
                    const ok = await switchTo(p.id);
                    if (!ok) {
                      showToast("No se pudo cambiar de frutería", "error");
                    }
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <span>
                    <span className="block font-medium text-slate-900">{p.businessName}</span>
                    {colony ? <span className="block text-xs text-slate-500">{colony}</span> : null}
                  </span>
                  {selected ? <Check size={16} aria-hidden className="text-[var(--brand)]" /> : null}
                </button>
              </li>
            );
          })}
          <li className="border-t border-gray-100">
            <Link
              href="/registro/negocio"
              className="flex min-h-11 items-center px-3 text-sm text-slate-600 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              onClick={() => setOpen(false)}
            >
              + Agregar frutería
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
