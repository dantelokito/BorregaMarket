"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Globe, Search, User } from "lucide-react";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1760px] mx-auto px-6 h-[80px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🍊</span>
          <span className="text-[var(--brand)] font-bold text-xl hidden sm:block">
            LaBorregaMarket
          </span>
        </Link>

        {/* Search pill — estilo Airbnb */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="flex items-center gap-0 border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow divide-x divide-gray-300 max-w-[480px] w-full mx-4"
        >
          <span className="px-4 py-2.5 text-sm font-medium text-gray-800 truncate flex-1 text-left">
            Fruterías en tu zona
          </span>
          <span className="px-4 py-2.5 text-sm text-gray-500 hidden md:block">
            Hoy
          </span>
          <span className="px-4 py-2.5 text-sm text-gray-400 hidden md:block">
            ¿Qué buscas?
          </span>
          <span className="m-1.5 p-2 bg-[var(--brand)] rounded-full text-white">
            <Search size={16} />
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/registro?role=provider"
            className="hidden md:block text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            Registra tu frutería
          </Link>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Globe size={18} />
          </button>
          <Link
            href="/login"
            className="flex items-center gap-2 border border-gray-300 rounded-full pl-3 pr-1 py-1 hover:shadow-md transition-shadow"
          >
            <Menu size={16} />
            <span className="p-1.5 bg-gray-500 rounded-full text-white">
              <User size={16} />
            </span>
          </Link>
        </div>
      </div>

      {/* Expanded search */}
      {searchOpen && (
        <div className="border-t border-gray-200 px-6 py-4 bg-white shadow-lg">
          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              type="text"
              placeholder="Buscar fruterías, frutas, verduras..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              autoFocus
            />
            <button className="px-6 py-2.5 bg-[var(--brand)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-dark)]">
              Buscar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
