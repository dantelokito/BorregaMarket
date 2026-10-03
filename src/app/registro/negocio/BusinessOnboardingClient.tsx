"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProvider } from "@/lib/api/providers";
import { getLegalCurrent } from "@/lib/api/legal";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { MiniMap } from "@/components/fruteria/MiniMap";
import { useToast } from "@/components/ui/Toast";
import { useProviderScope } from "@/hooks/useProviderScope";
import { notifyActiveProviderChanged } from "@/lib/api/provider-f11";
import { refreshSessionTheme } from "@/lib/api/auth";
import { digitsOnly } from "@/lib/phone";
import { ConsentCheckbox } from "@/components/legal/ConsentCheckbox";
import { LegalExternalLink } from "@/components/legal/LegalExternalLink";

const CONSENT_RETRY =
  "No pudimos registrar tu aceptación. Recarga la página e intenta de nuevo.";

export function BusinessOnboardingClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { providerCount, status } = useProviderScope();
  const isNewBranch = status === "ready" && providerCount >= 1;
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    city: "Monterrey",
    latitude: 25.6714,
    longitude: -100.3095,
    phone: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsVersion, setTermsVersion] = useState<number | null>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const phoneOk = digitsOnly(form.phone).length === 10;

  useEffect(() => {
    let active = true;
    getLegalCurrent()
      .then(({ data }) => {
        if (!active) return;
        setTermsVersion(data.documents.find((doc) => doc.type === "TERMS")?.version ?? null);
      })
      .catch(() => {
        if (active) setTermsVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  function onPhoneChange(phone: string) {
    const nextOk = digitsOnly(phone).length === 10;
    setForm({ ...form, phone });
    if (!nextOk) setWhatsappOptIn(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setConsentError("Debes aceptar los Términos para continuar");
      consentRef.current?.focus();
      return;
    }
    setConsentError("");
    if (!termsVersion) {
      setError(CONSENT_RETRY);
      return;
    }
    setLoading(true);

    try {
      await createProvider({
        businessName: form.businessName,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        phone: form.phone || undefined,
        description: form.description || undefined,
        acceptTerms: true,
        termsVersion,
        whatsappOrderOptIn: phoneOk && whatsappOptIn,
      });
      showToast("Frutería creada", "success");
      refreshSessionTheme();
      notifyActiveProviderChanged();
      router.push("/proveedor");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const consentField = err.details?.some((detail) =>
          ["acceptTerms", "termsVersion"].includes(detail.field)
        );
        setError(consentField ? CONSENT_RETRY : err.message);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        {isNewBranch ? (
          <Link
            href="/proveedor"
            className="min-h-11 text-sm text-gray-500 hover:text-[var(--brand)]"
          >
            Volver al panel
          </Link>
        ) : (
          <Link
            href="/registro"
            className="text-sm text-gray-500 hover:text-[var(--brand)]"
          >
            ← Atrás
          </Link>
        )}
      </div>

      {!isNewBranch && (
        <StepIndicator
          currentStep={2}
          totalSteps={2}
          labels={["Cuenta", "Negocio"]}
        />
      )}

      <h1 className="mb-2 text-2xl font-bold">
        {isNewBranch ? "Nueva frutería" : "Configura tu frutería"}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {isNewBranch
          ? "Se sumará a tu mismo usuario. Catálogo, POS y pedidos quedan aislados."
          : "Completa los datos de tu negocio para aparecer en el explorador"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del negocio"
          name="businessName"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          required
          minLength={2}
        />
        <Input
          label="Dirección"
          name="address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          required
        />
        <Input
          label="Ciudad"
          name="city"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <Input
          label="Teléfono"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Descripción
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Ubicación en el mapa</p>
          <p className="mb-2 text-xs text-gray-500">
            Haz clic en el mapa para colocar el pin de tu negocio
          </p>
          <MiniMap
            latitude={form.latitude}
            longitude={form.longitude}
            onLocationChange={(lat, lng) =>
              setForm({ ...form, latitude: lat, longitude: lng })
            }
            interactive
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-900">Avisos de pedidos</legend>
          <div className="flex min-h-11 items-start gap-3">
            <input
              id="whatsapp-optin"
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-slate-900"
              checked={whatsappOptIn}
              disabled={!phoneOk || loading}
              aria-describedby="whatsapp-optin-hint"
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
            />
            <label htmlFor="whatsapp-optin" className="text-sm text-slate-700">
              Recibir avisos de pedidos por WhatsApp al teléfono del negocio
            </label>
          </div>
          <p id="whatsapp-optin-hint" className="text-xs text-slate-600">
            {phoneOk
              ? "Opcional. Siempre recibirás los avisos por correo."
              : "Agrega un teléfono de 10 dígitos para activarlo."}
          </p>
        </fieldset>

        <ConsentCheckbox
          ref={consentRef}
          id="consent-provider-terms"
          checked={accepted}
          disabled={loading}
          error={consentError}
          onChange={(checked) => {
            setAccepted(checked);
            if (checked) setConsentError("");
          }}
        >
          Acepto los <LegalExternalLink href="/legal/terminos">Términos y Condiciones</LegalExternalLink>{" "}
          para fruterías: mi negocio es responsable del precio, calidad, peso e higiene de los productos
          que publica, y he leído el{" "}
          <LegalExternalLink href="/legal/privacidad">Aviso de Privacidad</LegalExternalLink>.
        </ConsentCheckbox>

        {error ? <ErrorBanner message={error} /> : null}

        <Button type="submit" loading={loading} loadingText="Creando…" className="w-full min-h-11 py-3">
          {isNewBranch ? "Crear frutería" : "Guardar y continuar"}
        </Button>
      </form>
    </div>
  );
}
