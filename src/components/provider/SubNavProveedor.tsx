"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Store, Warehouse } from "lucide-react";
import { listProviderOrders } from "@/lib/api/provider-ops";
import { useProviderScope } from "@/hooks/useProviderScope";
import { isProviderSubNavCurrent, providerSubNavTabs } from "@/lib/provider/subnav";

export function SubNavProveedor() {
  const pathname = usePathname();
  const { showGlobalReports } = useProviderScope();
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const tabs = providerSubNavTabs(showGlobalReports);

  useEffect(() => {
    listProviderOrders({ tab: "active", page: 1, limit: 1 })
      .then(({ meta }) => setActiveCount(meta?.total ?? 0))
      .catch(() => setActiveCount(null));
  }, [pathname]);

  return (
    <nav className="no-print border-b border-gray-200 bg-white" aria-label="Panel proveedor">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" role="list">
        {tabs.map((tab) => {
          const current = isProviderSubNavCurrent(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                  current
                    ? "border-[var(--brand)] text-[var(--brand)]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.href === "/proveedor/inventario" ? <Warehouse size={16} aria-hidden /> : null}
                {tab.href === "/proveedor/perfil" ? <Store size={16} aria-hidden /> : null}
                {tab.label}
                {tab.href === "/proveedor/ordenes" && activeCount != null && activeCount > 0 && (
                  <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs text-white">
                    {activeCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
