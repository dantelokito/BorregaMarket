"use client";

import { useEffect, useState } from "react";
import { getMyBusiness, updateProviderSettings } from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { ProviderBusiness } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VerificationRequiredBanner } from "@/components/reviews/VerificationRequiredBanner";
import { useToast } from "@/components/ui/Toast";

export function ProviderSettingsForm() {
  const { showToast } = useToast();
  const [business, setBusiness] = useState<ProviderBusiness | null>(null);
  const [prep, setPrep] = useState("20");
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyBusiness()
      .then(({ data }) => {
        setBusiness(data);
        setPrep(String(data.preparationTimeMinutes ?? 20));
        setOffersDelivery(Boolean(data.offersDelivery));
        setPlaceId(data.googlePlaceId ?? "");
        setMapsUrl(data.googleMapsUrl ?? "");
        setGoogleEnabled(Boolean(data.googleReviewsEnabled));
      })
      .catch(() => {
        setBusiness(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const locked = Boolean(business?.googleReviewsLocked) || business?.isVerified === false;

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
      const { data } = await updateProviderSettings({
        preparationTimeMinutes: minutes,
        offersDelivery,
        googlePlaceId: locked ? undefined : placeId.trim() || null,
        googleMapsUrl: locked ? undefined : mapsUrl.trim() || null,
        googleReviewsEnabled: locked ? undefined : googleEnabled,
      });
      setBusiness(data);
      showToast("Configuración guardada");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Requiere verificación de tu negocio");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No pudimos guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-200" aria-busy="true" />;
  }

  if (!business) return null;

  return (
    <section className="mb-10 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Operación y Google</h2>
      <form onSubmit={save} className="space-y-4">
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={offersDelivery}
            onChange={(e) => setOffersDelivery(e.target.checked)}
          />
          Ofrezco entrega a domicilio
        </label>

        {locked && <VerificationRequiredBanner />}

        <Input
          label="Google Place ID"
          name="googlePlaceId"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          disabled={locked}
          aria-describedby={locked ? "google-lock-hint" : undefined}
        />
        <Input
          label="URL de Google Maps"
          name="googleMapsUrl"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          disabled={locked}
          aria-describedby={locked ? "google-lock-hint" : undefined}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={googleEnabled}
            disabled={locked || (!placeId.trim() && !mapsUrl.trim())}
            onChange={(e) => setGoogleEnabled(e.target.checked)}
            aria-describedby={locked ? "google-lock-hint" : undefined}
          />
          Mostrar reseñas de Google en mi vitrina
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" loading={saving}>
          Guardar configuración
        </Button>
      </form>
    </section>
  );
}
