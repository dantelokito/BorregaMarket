"use client";

import { formatCurrency } from "@/lib/format";
import {
  barHeight,
  chartMax,
  type ChartPoint,
} from "@/lib/reports/unified-chart";

export function UnifiedProviderChart({
  variant,
  title,
  points,
  emptyCopy = "Sin ventas en este corte",
}: {
  variant: "trend" | "mix" | "top";
  title: string;
  points: ChartPoint[];
  emptyCopy?: string;
}) {
  const max = chartMax(points);
  const empty = points.length === 0 || max === 0;
  const aria = empty
    ? `${title}. Sin datos.`
    : `${title}. Máximo ${formatCurrency(max)}.`;

  return (
    <figure className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {empty ? (
        <p className="text-sm text-slate-600" role="status">
          {emptyCopy}
        </p>
      ) : variant === "top" ? (
        <HorizontalBars points={points} max={max} aria={aria} />
      ) : (
        <VerticalBars points={points} max={max} aria={aria} />
      )}
      <details className="mt-3 text-sm">
        <summary className="min-h-11 cursor-pointer text-[var(--brand)]">Ver datos en tabla</summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th className="py-1" scope="col">
                {variant === "mix" ? "Canal" : variant === "top" ? "Producto" : "Periodo"}
              </th>
              <th scope="col">Ventas</th>
              {points.some((p) => p.hint) ? <th scope="col">Detalle</th> : null}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td className="tabular-nums">{formatCurrency(p.value)}</td>
                {points.some((x) => x.hint) ? <td>{p.hint ?? "—"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function VerticalBars({
  points,
  max,
  aria,
}: {
  points: ChartPoint[];
  max: number;
  aria: string;
}) {
  const barWidth = points.length > 0 ? Math.min(48, 512 / points.length) : 48;
  const gap = points.length > 1 ? (560 - 48) / points.length : 76;
  return (
    <svg role="img" aria-label={aria} viewBox="0 0 560 180" className="h-48 w-full min-w-[280px]">
      {points.map((p, i) => {
        const h = barHeight(p.value, max);
        const x = 24 + i * gap;
        return (
          <g key={p.key}>
            <rect
              className="dash-bar report-bar"
              x={x}
              y={150 - h}
              width={barWidth}
              height={h}
              rx={4}
              fill="var(--brand)"
            />
            <text x={x + barWidth / 2} y={170} textAnchor="middle" fontSize="10" fill="#64748B">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalBars({
  points,
  max,
  aria,
}: {
  points: ChartPoint[];
  max: number;
  aria: string;
}) {
  const row = 28;
  const height = Math.max(80, points.length * row + 16);
  return (
    <svg role="img" aria-label={aria} viewBox={`0 0 560 ${height}`} className="w-full min-w-[280px]">
      {points.map((p, i) => {
        const w = max > 0 ? (p.value / max) * 320 : 0;
        const y = 8 + i * row;
        return (
          <g key={p.key}>
            <text x={0} y={y + 14} fontSize="11" fill="#334155">
              {p.label.length > 22 ? `${p.label.slice(0, 21)}…` : p.label}
            </text>
            <rect x={180} y={y} width={w} height={18} rx={4} fill="var(--brand)" />
            <text x={188 + w} y={y + 14} fontSize="11" fill="#334155">
              {formatCurrency(p.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
