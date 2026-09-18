"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VerificationRequiredBanner } from "@/components/reviews/VerificationRequiredBanner";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import type { PatchProviderSettingsInput } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";
import { safeHttpHref } from "@/lib/provider/safe-http-href";

export function ProfileGoogleBlock({
  business,
  onSave,
}: {
  business: ProviderBusiness;
  onSave: (input: PatchProviderSettingsInput) => Promise<ProviderBusiness>;
}) {
  const { showToast } = useToast();
  const locked = Boolean(business.googleReviewsLocked) || business.isVerified === false;
  const [placeId, setPlaceId] = useState(business.googlePlaceId ?? "");
  const [mapsUrl, setMapsUrl] = useState(business.googleMapsUrl ?? "");
  const [enabled, setEnabled] = useState(Boolean(business.googleReviewsEnabled));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        googlePlaceId: placeId.trim() || null,
        googleMapsUrl: mapsUrl.trim() || null,
        googleReviewsEnabled: enabled,
      });
      showToast("Guardado");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "Requiere verificación de tu negocio"
          : err instanceof ApiError
            ? err.message
            : "No pudimos guardar"
      );
    } finally {
      setSaving(false);
    }
  }

  const mapsHref = safeHttpHref(mapsUrl);

  return (
    <section id="google" className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Google Maps</h2>
      {locked ? (
        <div className="flex items-start gap-2">
          <Lock size={16} className="mt-1 text-slate-600" aria-hidden />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-slate-700">
              Maps y reseñas requieren verificación a la borrega.
            </p>
            <VerificationRequiredBanner />
          </div>
        </div>
      ) : null}
      <form onSubmit={(e) => void save(e)} className="space-y-4">
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
        {!locked && mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Abrir en Google Maps
          </a>
        ) : null}
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-900">
          <input
            type="checkbox"
            checked={enabled}
            disabled={locked || (!placeId.trim() && !mapsUrl.trim())}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-describedby={locked ? "google-lock-hint" : undefined}
            className="disabled:opacity-60"
          />
          Mostrar reseñas de Google en mi vitrina
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={saving} disabled={locked}>
          Guardar Google
        </Button>
      </form>
    </section>
  );
}
