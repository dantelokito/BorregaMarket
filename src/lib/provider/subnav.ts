export interface ProviderSubNavTab {
  href: string;
  label: string;
}

const BASE_TABS: ProviderSubNavTab[] = [
  { href: "/proveedor/inventario", label: "Inventario" },
  { href: "/proveedor", label: "Catálogo" },
  { href: "/proveedor/pos", label: "POS" },
  { href: "/proveedor/ordenes", label: "Órdenes" },
  { href: "/proveedor/dashboard", label: "Ventas" },
];

/** Perfil always last, including after Reportes generales (N>1). */
export function providerSubNavTabs(showGlobalReports: boolean): ProviderSubNavTab[] {
  const tabs = [...BASE_TABS];
  if (showGlobalReports) {
    tabs.push({ href: "/proveedor/reportes-generales", label: "Reportes generales" });
  }
  tabs.push({ href: "/proveedor/perfil", label: "Perfil" });
  return tabs;
}

export function isProviderSubNavCurrent(pathname: string, href: string): boolean {
  if (href === "/proveedor") return pathname === "/proveedor";
  return pathname.startsWith(href);
}
