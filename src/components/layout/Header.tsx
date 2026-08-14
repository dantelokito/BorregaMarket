"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Globe, Search, User, Menu } from "lucide-react";
import { UserMenu } from "@/components/ui/UserMenu";
import type { AuthUser } from "@/lib/api/types";

interface HeaderProps {
  user?: AuthUser | null;
}

export function Header({ user = null }: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const raw = searchQuery.trim();
    if (raw.length >= 2) {
      router.push(`/explorar?q=${encodeURIComponent(raw)}`);
    } else if (raw.length === 0) {
      router.push("/explorar");
    } else {
      // US-EXPLORE-02: min 2 chars — stay closed, do not hit API with invalid q
      return;
    }
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-[80px] max-w-[1760px] items-center justify-between gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-2xl">🍊</span>
          <span className="hidden text-xl font-bold text-[var(--brand)] sm:block">
            LaBorregaMarket
          </span>
        </Link>

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          aria-expanded={searchOpen}
          aria-label="Abrir búsqueda"
          className="mx-4 flex w-full max-w-[480px] items-center gap-0 divide-x divide-gray-300 rounded-full border border-gray-300 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <span className="flex-1 truncate px-4 py-2.5 text-left text-sm font-medium text-gray-800">
            Fruterías en tu zona
          </span>
          <span className="hidden px-4 py-2.5 text-sm text-gray-500 md:block">Hoy</span>
          <span className="hidden px-4 py-2.5 text-sm text-gray-400 md:block">¿Qué buscas?</span>
          <span className="m-1.5 rounded-full bg-[var(--brand)] p-2 text-white">
            <Search size={16} />
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {!user && (
            <Link
              href="/registro?role=provider"
              className="hidden rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 md:block"
            >
              Registra tu frutería
            </Link>
          )}
          <button
            aria-label="Idioma"
            className="rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <Globe size={18} />
          </button>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-gray-300 py-1 pl-3 pr-1 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <Menu size={16} />
              <span className="rounded-full bg-gray-500 p-1.5 text-white">
                <User size={16} />
              </span>
            </Link>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fruterías, frutas, verduras..."
              minLength={2}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              autoFocus
            />
            <button
              type="submit"
              disabled={searchQuery.trim().length === 1}
              className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
            >
              Buscar
            </button>
          </form>
          {searchQuery.trim().length === 1 && (
            <p className="mx-auto mt-2 max-w-2xl text-xs text-gray-500">
              Escribe al menos 2 caracteres para buscar
            </p>
          )}
        </div>
      )}
    </header>
  );
}
