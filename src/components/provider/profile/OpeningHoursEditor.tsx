"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { HoursTable } from "@/components/explore/HoursTable";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import type { OpeningHourDay } from "@/lib/api/types";
import type { PatchProviderSettingsInput } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";
import { DAY_LABELS } from "@/lib/providers/hours-format";
import {
  defaultHoursDraft,
  hoursDraftErrors,
  toOpeningHoursPayload,
} from "@/lib/provider/hours-editor";

export function OpeningHoursEditor({
  business,
  onSave,
}: {
  business: ProviderBusiness;
  onSave: (input: PatchProviderSettingsInput) => Promise<ProviderBusiness>;
}) {
  const { showToast } = useToast();
  const [days, setDays] = useState<OpeningHourDay[]>(() => defaultHoursDraft(business.openingHours));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const errors = useMemo(() => hoursDraftErrors(days), [days]);
  const unpublished = !business.openingHours || business.openingHours.length === 0;

  function update(day: number, patch: Partial<OpeningHourDay>) {
    setDays((prev) => prev.map((slot) => (slot.day === day ? { ...slot, ...patch } : slot)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      setFormError("Corrige los horarios marcados");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onSave({ openingHours: toOpeningHoursPayload(days) });
      showToast("Guardado");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="horarios" className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Horarios</h2>
        {unpublished ? (
          <p className="text-sm text-slate-600">
            Horario no publicado en Explorar hasta que guardes.
          </p>
        ) : null}
      </div>
      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-600">
                <th className="py-2">Día</th>
                <th className="py-2">Cerrado</th>
                <th className="py-2">Apertura</th>
                <th className="py-2">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {days.map((slot) => (
                <tr key={slot.day} className="border-t border-slate-100">
                  <th scope="row" className="py-2 font-normal text-slate-900">
                    {DAY_LABELS[slot.day]}
                  </th>
                  <td className="py-2">
                    <label className="inline-flex min-h-11 items-center gap-2">
                      <span className="sr-only">Cerrado {DAY_LABELS[slot.day]}</span>
                      <input
                        type="checkbox"
                        checked={slot.closed}
                        onChange={(e) =>
                          update(slot.day, {
                            closed: e.target.checked,
                            open: e.target.checked ? null : slot.open ?? "08:00",
                            close: e.target.checked ? null : slot.close ?? "18:00",
                          })
                        }
                      />
                    </label>
                  </td>
                  <td className="py-2">
                    <input
                      type="time"
                      value={slot.open ?? ""}
                      disabled={slot.closed}
                      onChange={(e) => update(slot.day, { open: e.target.value || null })}
                      className={`min-h-11 rounded-lg border px-2 disabled:opacity-60 ${
                        errors[slot.day] ? "border-red-500" : "border-gray-300"
                      }`}
                      aria-label={`Apertura ${DAY_LABELS[slot.day]}`}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="time"
                      value={slot.close ?? ""}
                      disabled={slot.closed}
                      onChange={(e) => update(slot.day, { close: e.target.value || null })}
                      className={`min-h-11 rounded-lg border px-2 disabled:opacity-60 ${
                        errors[slot.day] ? "border-red-500" : "border-gray-300"
                      }`}
                      aria-label={`Cierre ${DAY_LABELS[slot.day]}`}
                    />
                    {errors[slot.day] ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors[slot.day]}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={saving}>
          Guardar horarios
        </Button>
      </form>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-900">Así lo ve el cliente</p>
        <HoursTable hours={toOpeningHoursPayload(days)} />
      </div>
    </section>
  );
}
