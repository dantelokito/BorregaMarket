"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProvider } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { MiniMap } from "@/components/fruteria/MiniMap";
import { useToast } from "@/components/ui/Toast";
import { useProviderScope } from "@/hooks/useProviderScope";
import { notifyActiveProviderChanged } from "@/lib/api/provider-f11";
import { refreshSessionTheme } from "@/lib/api/auth";

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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createProvider({
        businessName: form.businessName,
        address: form.address,
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        phone: form.phone || undefined,
        description: form.description || undefined,
      });
      showToast("Frutería creada", "success");
      refreshSessionTheme();
      notifyActiveProviderChanged();
      router.push("/proveedor");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
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
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} loadingText="Creando…" className="w-full min-h-11 py-3">
          {isNewBranch ? "Crear frutería" : "Guardar y continuar"}
        </Button>
      </form>
    </div>
  );
}
