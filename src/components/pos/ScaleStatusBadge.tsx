"use client";

import type { ScaleDriver, ScaleStatus } from "@/lib/pos/scale/types";

const STATUS_COPY: Record<ScaleStatus, string> = {
  connected: "Báscula conectada",
  connecting: "Conectando…",
  disconnected: "Báscula desconectada",
  unsupported: "Báscula no disponible en este navegador",
  "needs-driver": "Elige el modelo de báscula",
};

interface ScaleStatusBadgeProps {
  status: ScaleStatus;
  driver?: ScaleDriver | null;
  drivers?: ScaleDriver[];
  liveGrams?: number | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSelectDriver?: (id: string) => void;
}

export function ScaleStatusBadge({
  status,
  driver,
  drivers = [],
  liveGrams,
  onConnect,
  onDisconnect,
  onSelectDriver,
}: ScaleStatusBadgeProps) {
  const style =
    status === "connected"
      ? "bg-emerald-50 text-emerald-800"
      : status === "connecting"
        ? "bg-amber-50 text-amber-800"
        : status === "unsupported" || status === "needs-driver"
          ? "bg-amber-50 text-amber-800"
          : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected"
                ? "bg-emerald-500"
                : status === "connecting"
                  ? "bg-amber-500"
                  : "bg-slate-400"
            }`}
            aria-hidden
          />
          {STATUS_COPY[status]}
        </span>
        {status === "connected" || status === "needs-driver" ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="h-11 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={status === "unsupported" || status === "connecting"}
            className="h-11 rounded-lg bg-[var(--brand)] px-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
          >
            Conectar
          </button>
        )}
      </div>
      {status === "unsupported" && (
        <p className="text-xs text-slate-500">Usa Chrome o Edge en escritorio. El keypad F3 sigue disponible.</p>
      )}
      {(status === "needs-driver" || status === "connected") && drivers.length > 0 && (
        <label className="block text-xs text-slate-600">
          Modelo
          <select
            value={driver?.id ?? ""}
            onChange={(e) => onSelectDriver?.(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {liveGrams != null && status === "connected" && (
        <p className="text-xs tabular-nums text-slate-500">{liveGrams} g</p>
      )}
    </div>
  );
}
