"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }

      const roleRedirects: Record<string, string> = {
        ADMIN: "/admin",
        PROVIDER: "/proveedor",
        CLIENT: redirect,
      };
      router.push(roleRedirects[data.user.role] ?? redirect);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h1 className="text-2xl font-bold mb-2">Iniciar sesión</h1>
      <p className="text-gray-500 text-sm mb-6">Accede a tu cuenta de LaBorregaMarket</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder="tu@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
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
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
        <p className="font-medium mb-2">Cuentas demo (password: Demo1234!):</p>
        <ul className="space-y-1 text-xs">
          <li>
            <button type="button" onClick={() => { setEmail("admin@laborregamarket.mx"); setPassword("Demo1234!"); }} className="text-[var(--brand)] hover:underline">
              admin@laborregamarket.mx
            </button> → Admin
          </li>
          <li>
            <button type="button" onClick={() => { setEmail("frutas@elparaiso.mx"); setPassword("Demo1234!"); }} className="text-[var(--brand)] hover:underline">
              frutas@elparaiso.mx
            </button> → Proveedor
          </li>
          <li>
            <button type="button" onClick={() => { setEmail("cliente@demo.mx"); setPassword("Demo1234!"); }} className="text-[var(--brand)] hover:underline">
              cliente@demo.mx
            </button> → Cliente
          </li>
        </ul>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-[var(--brand)] font-medium hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <Suspense fallback={<div className="text-center py-8">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
