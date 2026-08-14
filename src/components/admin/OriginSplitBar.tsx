interface OriginSplitBarProps {
  marketplace: { gmv: number; orderCount: number };
  pos: { gmv: number; orderCount: number };
}

export function OriginSplitBar({ marketplace, pos }: OriginSplitBarProps) {
  const total = marketplace.gmv + pos.gmv;
  const mPct = total === 0 ? 50 : (marketplace.gmv / total) * 100;
  const pPct = 100 - mPct;

  return (
    <figure className="rounded-xl border border-gray-200 bg-white p-5">
      <figcaption className="mb-3 text-sm font-medium">Origen de ventas</figcaption>
      <div className="flex h-4 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-[var(--brand)]" style={{ width: `${mPct}%` }} />
        <div className="bg-slate-400" style={{ width: `${pPct}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Marketplace {mPct.toFixed(0)}% · POS {pPct.toFixed(0)}%
      </p>
      <table className="sr-only">
        <caption>GMV por origen</caption>
        <thead>
          <tr>
            <th>Origen</th>
            <th>GMV</th>
            <th>Órdenes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Marketplace</td>
            <td>{marketplace.gmv}</td>
            <td>{marketplace.orderCount}</td>
          </tr>
          <tr>
            <td>POS</td>
            <td>{pos.gmv}</td>
            <td>{pos.orderCount}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
