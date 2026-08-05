"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        return;
      }
      router.push(form.role === "PROVIDER" ? "/proveedor" : "/explorar");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
      <p className="text-gray-500 text-sm mb-6">Únete a LaBorregaMarket</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de cuenta</label>
          <div className="flex gap-2">
            {(["CLIENT", "PROVIDER"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ ...form, role })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.role === role
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {role === "CLIENT" ? "Cliente" : "Proveedor"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--brand)] text-white rounded-lg font-semibold hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[var(--brand)] font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <Suspense fallback={<div className="text-center py-8">Cargando...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
