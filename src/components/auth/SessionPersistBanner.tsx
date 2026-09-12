"use client";

export const SESSION_PERSIST_COPY =
  "No pudimos mantener tu sesión en este navegador. Revisa que las cookies estén permitidas e intenta de nuevo.";

export function SessionPersistBanner({
  onRetry,
  cookiesBlocked,
}: {
  onRetry: () => void;
  cookiesBlocked?: boolean;
}) {
  return (
    <div className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-800" role="alert" aria-live="assertive">
      <p>
        {SESSION_PERSIST_COPY}
        {cookiesBlocked ? " Activa cookies para este sitio." : ""}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-medium text-red-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      >
        Reintentar
      </button>
    </div>
  );
}
