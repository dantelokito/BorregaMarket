"use client";

import Link from "next/link";

export function InventorySubTabs({ current }: { current: "existencias" | "movimientos" }) {
  const tabs = [
    { id: "existencias" as const, href: "/proveedor/inventario", label: "Existencias" },
    { id: "movimientos" as const, href: "/proveedor/inventario?tab=movimientos", label: "Movimientos" },
  ];
  return (
    <nav className="mt-4 border-b border-gray-200" aria-label="Subpestañas de inventario">
      <ul className="flex gap-1 overflow-x-auto" role="list">
        {tabs.map((tab) => {
          const currentTab = current === tab.id;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={currentTab ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-4 py-2 text-sm font-medium ${
                  currentTab
                    ? "border-[var(--brand)] text-[var(--brand)]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
