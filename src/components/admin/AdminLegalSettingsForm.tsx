"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ApiError } from "@/lib/api/client";
import {
  putAdminLegalSettings,
  type AdminLegalSettings,
  type LegalPersonType,
  type PutLegalSettingsBody,
} from "@/lib/api/legal";
import { formatLegalDate } from "@/lib/legal/format";

const RFC_PATTERN = /^[A-ZÑ&0-9]{12,13}$/;

type FieldErrors = Partial<Record<keyof PutLegalSettingsBody, string>>;

function validate(form: {
  personType: "" | LegalPersonType;
  legalName: string;
  rfc: string;
  address: string;
  arcoEmail: string;
  phone: string;
  effectiveAt: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (form.personType !== "FISICA" && form.personType !== "MORAL") {
    errors.personType = "Indica persona física o moral";
  }
  const name = form.legalName.trim();
  if (name.length < 2) errors.legalName = "Mínimo 2 caracteres";
  else if (name.length > 200) errors.legalName = "Máximo 200 caracteres";
  const address = form.address.trim();
  if (address.length < 10) errors.address = "Mínimo 10 caracteres";
  else if (address.length > 300) errors.address = "Máximo 300 caracteres";
  const email = form.arcoEmail.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.arcoEmail = "Correo inválido";
  else if (email.length > 254) errors.arcoEmail = "Máximo 254 caracteres";
  const phone = form.phone.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(phone)) errors.phone = "Teléfono de 10 dígitos";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveAt)) errors.effectiveAt = "Usa el formato AAAA-MM-DD";
  const rfc = form.rfc.trim().toUpperCase();
  if (rfc && form.personType) {
    const expected = form.personType === "MORAL" ? 12 : 13;
    if (!RFC_PATTERN.test(rfc) || rfc.length !== expected) {
      errors.rfc = `RFC de ${expected} caracteres alfanuméricos`;
    }
  }
  return errors;
}

const fieldClass =
  "min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900";

export function AdminLegalSettingsForm({
  initial,
  onSaved,
}: {
  initial: AdminLegalSettings;
  onSaved: (next: AdminLegalSettings) => void;
}) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [personType, setPersonType] = useState<"" | LegalPersonType>(initial.personType ?? "");
  const [legalName, setLegalName] = useState(initial.legalName ?? "");
  const [rfc, setRfc] = useState(initial.rfc ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [arcoEmail, setArcoEmail] = useState(initial.arcoEmail ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [effectiveAt, setEffectiveAt] = useState(initial.effectiveAt ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState("");
  const [banner, setBanner] = useState("");
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const empty = !initial.legalName && !initial.address && !initial.arcoEmail && !initial.phone;

  function focusFirst(next: FieldErrors) {
    const order: (keyof PutLegalSettingsBody)[] = [
      "personType",
      "legalName",
      "rfc",
      "phone",
      "address",
      "arcoEmail",
      "effectiveAt",
    ];
    const field = order.find((key) => next[key]);
    if (!field || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(`#legal-${field}`);
    el?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate({ personType, legalName, rfc, address, arcoEmail, phone, effectiveAt });
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setSummary("Revisa los campos marcados.");
      focusFirst(next);
      return;
    }
    if (personType !== "FISICA" && personType !== "MORAL") return;
    setSummary("");
    setBanner("");
    setSaving(true);
    const body: PutLegalSettingsBody = {
      personType,
      legalName: legalName.trim(),
      rfc: rfc.trim() ? rfc.trim().toUpperCase() : null,
      address: address.trim(),
      arcoEmail: arcoEmail.trim(),
      phone: phone.replace(/[\s-]/g, ""),
      effectiveAt,
    };
    try {
      const { data } = await putAdminLegalSettings(body);
      onSaved(data);
      showToast("Datos legales guardados");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.details?.length) {
        const mapped: FieldErrors = {};
        for (const detail of err.details) {
          if (detail.field in body || detail.field === "personType") {
            mapped[detail.field as keyof PutLegalSettingsBody] = detail.message;
          }
        }
        setErrors(mapped);
        setSummary("Revisa los campos marcados.");
        focusFirst(mapped);
      } else if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setLocked(true);
        setBanner("No tienes permiso para editar los datos legales.");
      } else {
        setBanner(err instanceof ApiError ? err.message : "No pudimos guardar. Revisa tu conexión.");
      }
    } finally {
      setSaving(false);
    }
  }

  const nameLabel = personType === "MORAL" ? "Razón social" : "Nombre completo";

  return (
    <form
      ref={formRef}
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      {empty ? (
        <p className="mb-4 text-sm text-slate-600">
          Estos datos aparecen en el footer y en el Aviso de Privacidad.
        </p>
      ) : null}
      {banner ? (
        <div className="mb-4">
          <ErrorBanner message={banner} />
        </div>
      ) : null}
      {summary ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {summary}
        </p>
      ) : null}
      <fieldset className="md:col-span-2" disabled={locked || saving}>
        <legend className="mb-2 text-sm font-medium text-slate-900">Tipo de persona</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(
            [
              ["FISICA", "Física"],
              ["MORAL", "Moral"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-slate-800">
              <input
                id={value === "FISICA" ? "legal-personType" : undefined}
                type="radio"
                name="personType"
                value={value}
                checked={personType === value}
                onChange={() => setPersonType(value)}
                className="h-5 w-5 accent-slate-900"
                aria-describedby={errors.personType ? "legal-personType-error" : undefined}
              />
              {label}
            </label>
          ))}
        </div>
        {errors.personType ? (
          <p id="legal-personType-error" className="mt-1 text-sm text-red-600">
            {errors.personType}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="legal-legalName" className="mb-1 block text-sm font-medium text-slate-900">
            {nameLabel}
          </label>
          <input
            id="legal-legalName"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            disabled={locked}
            aria-invalid={errors.legalName ? true : undefined}
            aria-describedby={errors.legalName ? "legal-legalName-error" : undefined}
            className={fieldClass}
          />
          {errors.legalName ? (
            <p id="legal-legalName-error" className="mt-1 text-sm text-red-600">
              {errors.legalName}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="legal-rfc" className="mb-1 block text-sm font-medium text-slate-900">
            RFC (opcional)
          </label>
          <input
            id="legal-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            disabled={locked}
            aria-invalid={errors.rfc ? true : undefined}
            aria-describedby="legal-rfc-hint"
            className={`${fieldClass} uppercase`}
          />
          <p id="legal-rfc-hint" className="mt-1 text-xs text-slate-500">
            {errors.rfc ?? "13 caracteres persona física, 12 persona moral."}
          </p>
        </div>
        <div>
          <label htmlFor="legal-phone" className="mb-1 block text-sm font-medium text-slate-900">
            Teléfono
          </label>
          <input
            id="legal-phone"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={locked}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby="legal-phone-hint"
            className={fieldClass}
          />
          <p id="legal-phone-hint" className="mt-1 text-xs text-slate-500">
            {errors.phone ?? "10 dígitos"}
          </p>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="legal-address" className="mb-1 block text-sm font-medium text-slate-900">
            Domicilio
          </label>
          <textarea
            id="legal-address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={locked}
            aria-invalid={errors.address ? true : undefined}
            aria-describedby={errors.address ? "legal-address-error" : undefined}
            className={`${fieldClass} min-h-24 py-2`}
          />
          {errors.address ? (
            <p id="legal-address-error" className="mt-1 text-sm text-red-600">
              {errors.address}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="legal-arcoEmail" className="mb-1 block text-sm font-medium text-slate-900">
            Correo para derechos ARCO
          </label>
          <input
            id="legal-arcoEmail"
            type="email"
            value={arcoEmail}
            onChange={(e) => setArcoEmail(e.target.value)}
            disabled={locked}
            aria-invalid={errors.arcoEmail ? true : undefined}
            aria-describedby={errors.arcoEmail ? "legal-arcoEmail-error" : undefined}
            className={fieldClass}
          />
          {errors.arcoEmail ? (
            <p id="legal-arcoEmail-error" className="mt-1 text-sm text-red-600">
              {errors.arcoEmail}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="legal-effectiveAt" className="mb-1 block text-sm font-medium text-slate-900">
            Vigente desde
          </label>
          <input
            id="legal-effectiveAt"
            type="date"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            disabled={locked}
            aria-invalid={errors.effectiveAt ? true : undefined}
            aria-describedby={errors.effectiveAt ? "legal-effectiveAt-error" : undefined}
            className={fieldClass}
          />
          {errors.effectiveAt ? (
            <p id="legal-effectiveAt-error" className="mt-1 text-sm text-red-600">
              {errors.effectiveAt}
            </p>
          ) : null}
        </div>
        {initial.updatedAt ? (
          <p className="text-xs text-slate-500 md:col-span-2">
            Última actualización: {formatLegalDate(initial.updatedAt)}
          </p>
        ) : null}
        <div className="flex justify-end md:col-span-2">
          <button
            type="submit"
            disabled={locked || saving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Guardando…" : "Guardar datos legales"}
          </button>
        </div>
      </div>
    </form>
  );
}
