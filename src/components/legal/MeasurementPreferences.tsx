"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { privacySignal, readMeasurement } from "@/lib/analytics/measurement";
import { useToast } from "@/components/ui/Toast";
import { useMeasurement } from "./MeasurementProvider";

function MeasurementSwitch({
  checked,
  disabled,
  describedBy,
  onChange,
  inputRef,
}: {
  checked: boolean;
  disabled?: boolean;
  describedBy?: string;
  onChange: (next: boolean) => void;
  inputRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={inputRef}
      type="button"
      role="switch"
      id="measurement-switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60 ${
        checked ? "bg-slate-900" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-9 w-9 rounded-full bg-white shadow transition-transform duration-150 motion-reduce:transition-none ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
        aria-hidden
      />
    </button>
  );
}

export function MeasurementPreferencesBody({
  autoFocus,
  showTitle,
  onDone,
  titleId,
}: {
  autoFocus?: boolean;
  showTitle?: boolean;
  onDone?: () => void;
  titleId?: string;
}) {
  const { choose, storageAvailable } = useMeasurement();
  const { showToast } = useToast();
  const signal = privacySignal();
  const reasonId = useId();
  const switchRef = useRef<HTMLButtonElement>(null);
  const [on, setOn] = useState(true);

  useEffect(() => {
    const current = readMeasurement().value;
    setOn(signal ? false : current !== "off");
  }, [signal]);

  useEffect(() => {
    if (autoFocus) switchRef.current?.focus();
  }, [autoFocus]);

  function save() {
    const next = signal ? "off" : on ? "on" : "off";
    choose(next);
    showToast("Preferencia guardada");
    onDone?.();
  }

  const describedBy = signal ? reasonId : undefined;

  return (
    <div>
      {showTitle ? (
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Preferencias de medición
        </h2>
      ) : null}
      {!storageAvailable ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Tu navegador no permite guardar esta preferencia; se aplicará solo en esta visita.
        </p>
      ) : null}
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-900">Cookies necesarias — Siempre activas</p>
        <p className="text-sm text-slate-600">
          Mantienen tu sesión y la frutería activa (<code>lbm_token</code>, <code>lbm_active_provider</code>).
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <label htmlFor="measurement-switch" className="text-sm font-medium text-slate-900">
            Medición anónima de uso
          </label>
          <p className="text-sm text-slate-600">
            Cuenta visitas y clics sin cookies ni datos personales (Umami).
          </p>
        </div>
        <MeasurementSwitch
          inputRef={switchRef}
          checked={signal ? false : on}
          disabled={Boolean(signal)}
          describedBy={describedBy}
          onChange={setOn}
        />
      </div>
      {signal ? (
        <p id={reasonId} className="mt-2 text-sm text-slate-600">
          {signal === "dnt"
            ? "Tu navegador pide no ser medido (Do Not Track) y lo respetamos."
            : "Tu navegador pide no ser medido (Global Privacy Control) y lo respetamos."}
        </p>
      ) : null}
      <p className="mt-4">
        <Link
          href="/legal/cookies"
          className="text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Leer la Política de Cookies
        </Link>
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Guardar preferencia
        </button>
      </div>
    </div>
  );
}

export function MeasurementPreferencesDialog() {
  const { dialogOpen, closePreferences } = useMeasurement();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePreferences();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, [tabindex]:not([tabindex='-1'])"
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [dialogOpen, closePreferences]);

  if (!dialogOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={closePreferences} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full rounded-t-xl bg-white p-6 shadow-lg sm:max-w-md sm:rounded-xl"
      >
        <MeasurementPreferencesBody autoFocus showTitle onDone={closePreferences} titleId={titleId} />
      </div>
    </div>
  );
}

export function MeasurementPreferencesInline() {
  return (
    <section id="preferencias" className="no-print mt-10 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Preferencias de medición</h2>
      <MeasurementPreferencesBody />
    </section>
  );
}
