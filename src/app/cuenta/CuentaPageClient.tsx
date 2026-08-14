"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyProfile, updateMyProfile } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SkeletonForm } from "@/components/ui/SkeletonCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { OrdersHistory } from "@/components/orders/OrdersHistory";

export function CuentaPageClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => {
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone ?? "");
      })
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Error al cargar perfil");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const { data } = await updateMyProfile({ name, phone: phone || null });
      setName(data.name);
      setPhone(data.phone ?? "");
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <SkeletonForm />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="mb-2 text-2xl font-bold">Mi cuenta</h1>
        <p className="mb-6 text-sm text-gray-500">Administra tu información personal</p>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {success && (
          <p
            className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            Cambios guardados correctamente
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">El email no se puede modificar</p>
          </div>
          <Input
            label="Teléfono"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <h2 className="mb-4 text-xl font-semibold">Mis pedidos</h2>
        <OrdersHistory />
      </div>

      <Link href="/explorar" className="text-sm font-medium text-[var(--brand)] hover:underline">
        ← Volver a explorar
      </Link>
    </div>
  );
}
