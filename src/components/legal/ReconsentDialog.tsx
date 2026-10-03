"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getAuthSession, logout } from "@/lib/api/auth";
import { acceptConsents, type PendingConsent } from "@/lib/api/legal";
import { ApiError } from "@/lib/api/client";
import { clearClientCaches } from "@/lib/session/clear-client-caches";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { LegalExternalLink } from "./LegalExternalLink";

export function ReconsentDialog() {
  const [pending, setPending] = useState<PendingConsent[] | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getAuthSession()
      .then((session) => {
        if (!active) return;
        if (session.authenticated && session.pendingConsents && session.pendingConsents.length > 0) {
          setPending(session.pendingConsents);
        }
      })
      .catch(() => {
        if (active) setPending(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pending?.length) return;
    boxRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
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
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [pending]);

  if (!pending?.length) return null;

  async function accept() {
    if (!pending) return;
    setSaving(true);
    setError("");
    try {
      await acceptConsents(pending.map((doc) => ({ type: doc.type, version: doc.version })));
      setPending([]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "No pudimos registrar tu aceptación. Recarga la página e intenta de nuevo."
          : "No pudimos registrar tu aceptación. Recarga la página e intenta de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setSaving(true);
    try {
      await logout();
      await clearClientCaches();
      window.location.assign("/");
    } catch {
      setSaving(false);
      setError("No pudimos cerrar la sesión. Intenta de nuevo.");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full rounded-t-xl bg-white p-6 shadow-lg sm:max-w-md sm:rounded-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Actualizamos nuestros Términos
        </h2>
        <p className="mt-2 text-sm text-slate-700">Revisa los cambios para seguir usando tu cuenta.</p>
        <p className="mt-3 flex flex-col gap-1 text-sm">
          <LegalExternalLink href="/legal/terminos">Términos y Condiciones</LegalExternalLink>
          <LegalExternalLink href="/legal/privacidad">Aviso de Privacidad</LegalExternalLink>
        </p>
        <div className="mt-4">
          <ConsentCheckbox
            ref={boxRef}
            id="reconsent-terms"
            checked={accepted}
            disabled={saving}
            onChange={setAccepted}
          >
            Acepto los <LegalExternalLink href="/legal/terminos">Términos y Condiciones</LegalExternalLink>,
            declaro ser mayor de 18 años (o contar con autorización de mi tutor) y he leído el{" "}
            <LegalExternalLink href="/legal/privacidad">Aviso de Privacidad</LegalExternalLink>.
          </ConsentCheckbox>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => void accept()}
            disabled={!accepted || saving}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Aceptar y continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
