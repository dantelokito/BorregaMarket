"use client";

export function PosImagesToggle({
  checked,
  onChange,
  disabled,
  error,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Mostrar fotos en el POS</p>
          <p className="mt-1 text-xs text-slate-500">
            Aplica al mostrador de esta frutería. Las miniaturas de esta lista no se apagan.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label="Mostrar fotos en el POS"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-11 min-h-11 min-w-11 w-14 shrink-0 items-center rounded-full px-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60 ${
            checked ? "bg-[var(--brand)]" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-9 w-9 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-3" : "translate-x-0"
            }`}
            aria-hidden
          />
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
