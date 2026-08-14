"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, User, LogOut, Settings, Store, Shield, Search, ShoppingCart } from "lucide-react";
import { logout } from "@/lib/api/auth";
import type { AuthUser } from "@/lib/api/types";

interface UserMenuProps {
  user: AuthUser;
}

const ROLE_LABELS: Record<AuthUser["role"], string> = {
  CLIENT: "Cliente",
  PROVIDER: "Proveedor",
  ADMIN: "Administrador",
};

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const roleLinks: Record<AuthUser["role"], { href: string; label: string; icon: typeof User }[]> = {
    CLIENT: [
      { href: "/explorar", label: "Explorar", icon: Search },
      { href: "/carrito", label: "Mi encargo", icon: ShoppingCart },
      { href: "/cuenta", label: "Mi cuenta", icon: Settings },
    ],
    PROVIDER: [
      { href: "/proveedor", label: "Panel proveedor", icon: Store },
      { href: "/explorar", label: "Explorar", icon: Search },
    ],
    ADMIN: [
      { href: "/admin", label: "Panel admin", icon: Shield },
      { href: "/explorar", label: "Explorar", icon: Search },
    ],
  };

  const links = roleLinks[user.role];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menú de usuario"
        className="flex items-center gap-2 rounded-full border border-gray-300 py-1 pl-3 pr-1 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      >
        <Menu size={16} />
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
          {user.name.split(" ")[0]}
        </span>
        <span className="rounded-full bg-gray-500 p-1.5 text-white">
          <User size={16} />
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--brand)]">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          <button
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
