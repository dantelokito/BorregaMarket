"use client";

import { useEffect, useMemo, useState } from "react";
import { getMyBusiness, updateProviderSettings } from "@/lib/api/provider-panel";
import { refreshSessionTheme } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  canonicalizeHex,
  contrastVsWhite,
  isPrimaryContrastValid,
  isSecondaryContrastValid,
  isValidHex,
} from "@/lib/color/contrast";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const PLATFORM_PRIMARY = "#e23744";
const PLATFORM_SECONDARY = "#c13515";

export function BrandColorPicker() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyBusiness()
      .then(({ data }) => {
        setPrimary(data.primaryColor ?? "");
        setSecondary(data.secondaryColor ?? "");
      })
      .catch(() => {
        setPrimary("");
        setSecondary("");
      })
      .finally(() => setLoading(false));
  }, []);

  const primaryOk = !primary || (isValidHex(primary) && isPrimaryContrastValid(primary));
  const secondaryOk = !secondary || (isValidHex(secondary) && isSecondaryContrastValid(secondary));
  const pairComplete = (primary === "" && secondary === "") || (Boolean(primary) && Boolean(secondary));
  const canSave = pairComplete && primaryOk && secondaryOk && (primary === "" || isValidHex(primary)) && (secondary === "" || isValidHex(secondary));

  const previewPrimary = isValidHex(primary) ? canonicalizeHex(primary)! : PLATFORM_PRIMARY;
  const previewSecondary = isValidHex(secondary) ? canonicalizeHex(secondary)! : PLATFORM_SECONDARY;
  const primaryRatio = useMemo(
    () => (isValidHex(primary) ? contrastVsWhite(primary) ?? 0 : contrastVsWhite(PLATFORM_PRIMARY) ?? 0),
    [primary]
  );

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const bothEmpty = primary === "" && secondary === "";
      const { data } = await updateProviderSettings({
        primaryColor: bothEmpty ? null : canonicalizeHex(primary),
        secondaryColor: bothEmpty ? null : canonicalizeHex(secondary),
      });
      setPrimary(data.primaryColor ?? "");
      setSecondary(data.secondaryColor ?? "");
      refreshSessionTheme();
      showToast("Colores de tu marca actualizados");
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        const next: Record<string, string> = {};
        for (const d of err.details) next[d.field] = d.message;
        setFieldErrors(next);
        setError(err.message);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No pudimos guardar los colores");
      }
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setPrimary("");
    setSecondary("");
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      await updateProviderSettings({ primaryColor: null, secondaryColor: null });
      refreshSessionTheme();
      showToast("Colores de tu marca actualizados");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos restaurar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-10 space-y-4 rounded-xl border border-gray-200 bg-white p-6" aria-busy="true">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-11 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-11 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Colores de tu marca</h2>
        <p className="mt-1 text-sm text-slate-600">
          Primario y secundario se ven en tu panel, POS y si entras a Explorar con tu cuenta de
          frutería. Los clientes siguen viendo la marca de LaBorregaMarket.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          id="brand-primary"
          label="Primario"
          value={primary}
          onChange={setPrimary}
          error={
            fieldErrors.primaryColor ||
            (primary && !isValidHex(primary)
              ? "Usa un color hexadecimal (#RRGGBB)"
              : primary && !primaryOk
                ? "El color primario no tiene suficiente contraste para el texto del botón. Ajústalo o usa la marca de la plataforma."
                : "")
          }
        />
        <ColorField
          id="brand-secondary"
          label="Secundario"
          value={secondary}
          onChange={setSecondary}
          error={
            fieldErrors.secondaryColor ||
            (secondary && !isValidHex(secondary)
              ? "Usa un color hexadecimal (#RRGGBB)"
              : secondary && !secondaryOk
                ? "El color secundario no tiene contraste suficiente para acentos (mínimo 3:1 sobre blanco)"
                : "")
          }
        />
      </div>

      {!pairComplete && (
        <p className="text-sm text-amber-800" role="status">
          Debes indicar primario y secundario, o restablecer ambos.
        </p>
      )}

      <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
        <p className="mb-2 text-sm font-medium">Preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
            style={{ backgroundColor: previewPrimary }}
          >
            Encargar / Cobrar
          </span>
          <span
            className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium text-white"
            style={{ backgroundColor: previewSecondary }}
          >
            Acento chip
          </span>
        </div>
        <p className={`mt-2 text-sm ${primaryOk ? "text-emerald-700" : "text-red-600"}`}>
          Contraste CTA: {primaryOk ? "✓ Cumple WCAG AA" : "✗ Insuficiente"} (
          {primaryRatio.toFixed(1)}:1)
        </p>
        {!primary && !secondary && (
          <p className="mt-1 text-sm text-slate-500">Usas los colores de LaBorregaMarket</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} loading={saving} disabled={!canSave}>
          Guardar colores
        </Button>
        <Button type="button" variant="ghost" onClick={() => void reset()} disabled={saving}>
          Restaurar marca de plataforma
        </Button>
      </div>
    </section>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const colorValue = isValidHex(value) ? value : "#e23744";
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} (selector)`}
          value={colorValue}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-11 cursor-pointer rounded border border-gray-300 bg-white p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
