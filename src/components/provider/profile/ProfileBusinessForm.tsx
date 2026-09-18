"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { isWithinMonterreyBounds } from "@/lib/geo/bounds";
import type { PatchProviderSettingsInput } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";

export function ProfileBusinessForm({
  business,
  onSave,
}: {
  business: ProviderBusiness;
  onSave: (input: PatchProviderSettingsInput) => Promise<ProviderBusiness>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(business.businessName);
  const [address, setAddress] = useState(business.address);
  const [city, setCity] = useState(business.city);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [description, setDescription] = useState(business.description ?? "");
  const [lat, setLat] = useState(String(business.latitude));
  const [lng, setLng] = useState(String(business.longitude));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.businessName = "Indica el nombre del negocio";
    if (!address.trim()) next.address = "Indica la dirección";
    if (!city.trim()) next.city = "Indica la ciudad";
    if (!phone.trim()) next.phone = "Indica el teléfono";
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      next.latitude = "Usa coordenadas numéricas";
      next.longitude = "Usa coordenadas numéricas";
    } else if (!isWithinMonterreyBounds(latitude, longitude)) {
      next.latitude = "Ubicación fuera del área de Monterrey";
      next.longitude = "Ubicación fuera del área de Monterrey";
    }
    return next;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave({
        businessName: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        description: description.trim() || null,
        latitude: Number(lat),
        longitude: Number(lng),
      });
      showToast("Guardado");
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const d of err.details ?? []) {
          if (d.field) mapped[d.field] = d.message;
        }
        setErrors(mapped);
        setFormError(err.message);
      } else {
        setFormError("No pudimos guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="datos" className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Datos del negocio</h2>
        <p className="text-sm text-slate-600">El sello verificado no se quita al mover el pin.</p>
      </div>
      <form onSubmit={(e) => void save(e)} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nombre"
            name="businessName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.businessName}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Dirección"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={errors.address}
            required
          />
        </div>
        <Input
          label="Ciudad"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          error={errors.city}
          required
        />
        <Input
          label="Teléfono"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          required
        />
        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <Input
          label="Latitud"
          name="latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          error={errors.latitude}
          required
        />
        <Input
          label="Longitud"
          name="longitude"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          error={errors.longitude}
          required
        />
        {formError ? (
          <p className="sm:col-span-2 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={saving}>
            Guardar datos
          </Button>
        </div>
      </form>
    </section>
  );
}
