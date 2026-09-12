import { buildHoursRows } from "@/lib/providers/hours-format";
import type { OpeningHourDay } from "@/lib/api/types";

export function HoursTable({ hours }: { hours: OpeningHourDay[] | null | undefined }) {
  const rows = buildHoursRows(hours);
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">Horario no publicado</p>;
  }

  return (
    <div className="max-h-48 overflow-y-auto">
      <table className="hidden w-full text-left text-sm sm:table">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-600">
            <th scope="col" className="py-1 font-medium">
              Día
            </th>
            <th scope="col" className="py-1 font-medium">
              Apertura
            </th>
            <th scope="col" className="py-1 font-medium">
              Cierre
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day} className="border-t border-slate-100">
              <th scope="row" className="py-1.5 font-normal text-slate-900">
                {row.label}
              </th>
              <td className="py-1.5 text-slate-700">{row.open}</td>
              <td className="py-1.5 text-slate-700">{row.close}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-1.5 sm:hidden">
        {rows.map((row) => (
          <li key={row.day} className="border-t border-slate-100 pt-1.5 text-sm first:border-t-0">
            <span className="block text-slate-900">{row.label}</span>
            <span className="block text-slate-700">{row.rangeLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
