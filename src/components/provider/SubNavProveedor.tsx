"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { listProviderOrders } from "@/lib/api/provider-ops";

const TABS = [
  { href: "/proveedor", label: "Catálogo" },
  { href: "/proveedor/pos", label: "POS" },
  { href: "/proveedor/ordenes", label: "Órdenes" },
  { href: "/proveedor/dashboard", label: "Ventas" },
] as const;

export function SubNavProveedor() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    listProviderOrders({ tab: "active", page: 1, limit: 1 })
      .then(({ meta }) => setActiveCount(meta?.total ?? 0))
      .catch(() => setActiveCount(null));
  }, [pathname]);

  return (
    <nav
      className="border-b border-gray-200 bg-white"
      aria-label="Panel proveedor"
    >
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" role="list">
        {TABS.map((tab) => {
          const current =
            tab.href === "/proveedor"
              ? pathname === "/proveedor"
              : pathname.startsWith(tab.href);
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
