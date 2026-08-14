"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StepIndicator } from "@/components/ui/StepIndicator";

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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await register(form);
      if (form.role === "PROVIDER") {
        router.push("/registro/negocio");
      } else {
        router.push("/explorar");
      }
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

        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

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
