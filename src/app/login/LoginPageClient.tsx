"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { isValidRedirect } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const isDev = process.env.NODE_ENV !== "production";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") ?? searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);

      const roleRedirects: Record<string, string> = {
        ADMIN: "/admin",
        PROVIDER: "/proveedor",
        CLIENT: "/",
      };

      let destination = roleRedirects[user.role] ?? "/";
      if (redirectParam && isValidRedirect(redirectParam)) {
        destination = redirectParam;
      }

      router.push(destination);
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
      <h1 className="mb-2 text-2xl font-bold">Iniciar sesión</h1>
      <p className="mb-6 text-sm text-gray-500">Accede a tu cuenta de LaBorregaMarket</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          disabled={loading}
        />
        <div>
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres</p>
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

        <Button
          type="submit"
          loading={loading}
          loadingText="Ingresando..."
          className="w-full py-3"
        >
          Ingresar
        </Button>
      </form>

      {isDev && (
        <div className="mt-6 border-t border-gray-200 pt-6 text-sm text-gray-500">
          <p className="mb-2 font-medium">Cuentas demo (password: Demo1234!):</p>
          <ul className="space-y-1 text-xs">
            <li>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@laborregamarket.mx");
                  setPassword("Demo1234!");
                }}
                className="text-[var(--brand)] hover:underline"
              >
                admin@laborregamarket.mx
              </button>{" "}
              → Admin
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setEmail("frutas@elparaiso.mx");
                  setPassword("Demo1234!");
                }}
                className="text-[var(--brand)] hover:underline"
              >
                frutas@elparaiso.mx
              </button>{" "}
              → Proveedor
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setEmail("cliente@demo.mx");
                  setPassword("Demo1234!");
                }}
                className="text-[var(--brand)] hover:underline"
              >
                cliente@demo.mx
              </button>{" "}
              → Cliente
            </li>
          </ul>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-[var(--brand)] hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}

export function LoginPageClient() {
  return (
    <Suspense fallback={<div className="py-8 text-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
