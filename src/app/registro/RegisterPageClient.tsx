"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { register } from "@/lib/api/auth";
import { getLegalCurrent } from "@/lib/api/legal";
import { ApiError } from "@/lib/api/client";
import { track } from "@/lib/analytics/track";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { ConsentCheckbox } from "@/components/legal/ConsentCheckbox";
import { LegalExternalLink } from "@/components/legal/LegalExternalLink";

const CONSENT_RETRY =
  "No pudimos registrar tu aceptación. Recarga la página e intenta de nuevo.";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "provider" ? "PROVIDER" : "CLIENT";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: defaultRole as "CLIENT" | "PROVIDER",
  });
  const [error, setError] = useState("");
  const [consentError, setConsentError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsVersion, setTermsVersion] = useState<number | null>(null);
  const [privacyVersion, setPrivacyVersion] = useState<number | null>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getLegalCurrent()
      .then(({ data }) => {
        if (!active) return;
        setTermsVersion(data.documents.find((doc) => doc.type === "TERMS")?.version ?? null);
        setPrivacyVersion(data.documents.find((doc) => doc.type === "PRIVACY")?.version ?? null);
      })
      .catch(() => {
        if (active) {
          setTermsVersion(null);
          setPrivacyVersion(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setConsentError("Debes aceptar los Términos para continuar");
      consentRef.current?.focus();
      return;
    }
    setConsentError("");
    if (!termsVersion || !privacyVersion) {
      setError(CONSENT_RETRY);
      return;
    }
    setLoading(true);

    try {
      await register({
        ...form,
        acceptLegal: true,
        termsVersion,
        privacyVersion,
      });
      track("register_success", { source: form.role });
      if (form.role === "PROVIDER") {
        router.push("/registro/negocio");
      } else {
        router.push("/explorar");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const consentField = err.details?.some((detail) =>
          ["acceptLegal", "termsVersion", "privacyVersion"].includes(detail.field)
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
      {form.role === "PROVIDER" && (
        <StepIndicator
          currentStep={1}
          totalSteps={2}
          labels={["Cuenta", "Negocio"]}
        />
      )}

      <h1 className="mb-2 text-2xl font-bold">Crear cuenta</h1>
      <p className="mb-6 text-sm text-gray-500">Únete a LaBorregaMarket</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Tipo de cuenta</label>
          <div className="flex gap-2">
            {(["CLIENT", "PROVIDER"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                  form.role === role
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {role === "CLIENT" ? "Cliente" : "Proveedor"}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Nombre"
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          label="Teléfono"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Contraseña"
          type="password"
          name="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>

        <ConsentCheckbox
          ref={consentRef}
          id="consent-terms"
          checked={accepted}
          disabled={loading}
          error={consentError}
          onChange={(checked) => {
            setAccepted(checked);
            if (checked) setConsentError("");
          }}
        >
          Acepto los <LegalExternalLink href="/legal/terminos">Términos y Condiciones</LegalExternalLink>,
          declaro ser mayor de 18 años (o contar con autorización de mi tutor) y he leído el{" "}
          <LegalExternalLink href="/legal/privacidad">Aviso de Privacidad</LegalExternalLink>.
        </ConsentCheckbox>

        {error ? <ErrorBanner message={error} /> : null}

        <Button type="submit" loading={loading} loadingText="Registrando..." className="w-full py-3">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

export function RegisterPageClient() {
  return (
    <Suspense fallback={<div className="py-8 text-center">Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
