import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-600">Esta página no existe.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
