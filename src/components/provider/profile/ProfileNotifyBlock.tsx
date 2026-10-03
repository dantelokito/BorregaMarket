"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { PatchProviderSettingsInput } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";
import { useToast } from "@/components/ui/Toast";
import { digitsOnly } from "@/lib/phone";
import { formatMxPhone } from "@/lib/legal/format";

export function ProfileNotifyBlock({
  business,
  onSave,
}: {
  business: ProviderBusiness;
  onSave: (input: PatchProviderSettingsInput) => Promise<ProviderBusiness>;
}) {
  const { showToast } = useToast();
  const phoneOk = digitsOnly(business.phone ?? "").length === 10;
  const saved = Boolean(business.whatsappOrderOptIn);
  const [optIn, setOptIn] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reasonId = "notify-whatsapp-reason";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ whatsappOrderOptIn: phoneOk ? optIn : false });
      showToast("Guardado");
    } catch (err) {
      setOptIn(saved);
      setError(err instanceof ApiError ? err.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="avisos" className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Avisos de pedidos</h2>
      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <div className="flex min-h-11 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="notify-whatsapp-optin" className="text-sm font-medium text-slate-900">
              Recibir avisos de pedidos por WhatsApp al teléfono del negocio
            </label>
            <p id={reasonId} className="text-xs text-slate-600">
              {phoneOk ? (
                "Opcional. Siempre recibes los avisos por correo."
              ) : (
                <>
                  Agrega un teléfono de 10 dígitos en{" "}
                  <a href="#datos" className="underline underline-offset-2">
                    Datos del negocio
                  </a>
                  .
                </>
              )}
            </p>
          </div>
          <button
            id="notify-whatsapp-optin"
            type="button"
            role="switch"
            aria-checked={phoneOk ? optIn : false}
            aria-describedby={reasonId}
            disabled={!phoneOk || saving}
            onClick={() => setOptIn((v) => !v)}
            className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full px-1 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 ${
              phoneOk && optIn ? "bg-slate-900" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-9 w-9 rounded-full bg-white shadow transition-transform duration-150 motion-reduce:transition-none ${
                phoneOk && optIn ? "translate-x-3" : "translate-x-0"
              }`}
              aria-hidden
            />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          {phoneOk && optIn
            ? `Avisos por WhatsApp a ${formatMxPhone(business.phone)}.`
            : "Hoy recibes los avisos solo por correo."}
        </p>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Guardando…" : "Guardar avisos"}
        </button>
      </form>
    </section>
  );
}
