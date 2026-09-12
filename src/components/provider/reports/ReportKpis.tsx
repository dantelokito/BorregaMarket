"use client";

import { formatCurrency } from "@/lib/format";

export function ReportKpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-[1.875rem] font-semibold tabular-nums leading-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ReportBarChart({
  series,
  title,
}: {
  series: { bucket: string; gmv: string; orderCount: number }[];
  title: string;
}) {
  const max = Math.max(...series.map((s) => Number(s.gmv)), 1);
  const label = `${title}. Máximo ${formatCurrency(max)}.`;
  const barWidth = series.length > 0 ? Math.min(48, 512 / series.length) : 48;
  const gap = series.length > 1 ? (560 - 48) / series.length : 76;

  return (
    <figure>
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 560 180"
        className="h-48 w-full min-w-[320px]"
      >
        {series.map((s, i) => {
          const h = (Number(s.gmv) / max) * 140;
          const x = 24 + i * gap;
          return (
            <g key={s.bucket}>
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
                {s.bucket.length > 7 ? s.bucket.slice(5) : s.bucket}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="report-data-table sr-only mt-2 w-full text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th className="py-1">Periodo</th>
            <th>Ventas</th>
            <th>Órdenes</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.bucket}>
              <td>
                <time dateTime={s.bucket}>{s.bucket}</time>
              </td>
              <td className="tabular-nums">{formatCurrency(s.gmv)}</td>
              <td className="tabular-nums">{s.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
