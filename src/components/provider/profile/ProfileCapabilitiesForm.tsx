"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import type { PatchProviderSettingsInput } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {label}
        </label>
        <p className="text-xs text-slate-600">{hint}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-11 min-h-11 min-w-11 w-14 shrink-0 items-center rounded-full px-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
          checked ? "bg-[var(--brand)]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-9 w-9 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function ProfileCapabilitiesForm({
  business,
  onSave,
}: {
  business: ProviderBusiness;
  onSave: (input: PatchProviderSettingsInput) => Promise<ProviderBusiness>;
}) {
  const { showToast } = useToast();
  const [whatsapp, setWhatsapp] = useState(Boolean(business.whatsappEnabled));
  const [card, setCard] = useState(Boolean(business.acceptsCardAtStore));
  const [wholesale, setWholesale] = useState(Boolean(business.offersWholesale));
  const [retail, setRetail] = useState(business.offersRetail !== false);
  const [delivery, setDelivery] = useState(Boolean(business.offersDelivery));
  const [prep, setPrep] = useState(String(business.preparationTimeMinutes ?? 20));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const minutes = Number(prep);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120) {
      setError("El tiempo de preparación debe estar entre 5 y 120 minutos");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        whatsappEnabled: whatsapp,
        acceptsCardAtStore: card,
        offersWholesale: wholesale,
        offersRetail: retail,
        offersDelivery: delivery,
        preparationTimeMinutes: minutes,
      });
      showToast("Guardado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="capacidades" className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Capacidades y operación</h2>
      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <SwitchRow
          id="cap-whatsapp"
          label="WhatsApp"
          hint="Los clientes pueden contactarte por WhatsApp."
          checked={whatsapp}
          onChange={setWhatsapp}
        />
        <SwitchRow
          id="cap-card"
          label="Tarjeta en tienda"
          hint="Aceptas pago con tarjeta en mostrador."
          checked={card}
          onChange={setCard}
        />
        <SwitchRow
          id="cap-wholesale"
          label="Mayoreo"
          hint="Ofreces venta por volumen."
          checked={wholesale}
          onChange={setWholesale}
        />
        <SwitchRow
          id="cap-retail"
          label="Menudeo"
          hint="Ofreces venta al menudeo."
          checked={retail}
          onChange={setRetail}
        />
        <SwitchRow
          id="cap-delivery"
          label="Entrega a domicilio"
          hint="Ofrezco entrega a domicilio"
          checked={delivery}
          onChange={setDelivery}
        />
        <div>
          <label htmlFor="prep-time" className="mb-1 block text-sm font-medium">
            Tiempo de preparación (minutos)
          </label>
          <input
            id="prep-time"
            type="number"
            min={5}
            max={120}
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            className="h-11 w-full max-w-xs rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={saving}>
          Guardar capacidades
        </Button>
      </form>
    </section>
  );
}
