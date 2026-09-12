"use client";

import { Trash2 } from "lucide-react";
import type { UserAddress } from "@/lib/api/types";

interface FavoriteAddressRowProps {
  address: UserAddress;
  selected: boolean;
  onSelect: (address: UserAddress) => void;
  onDelete: (address: UserAddress) => void;
}

export function FavoriteAddressRow({
  address,
  selected,
  onSelect,
  onDelete,
}: FavoriteAddressRowProps) {
  return (
    <div
      className={`flex min-h-11 items-stretch gap-1 rounded-lg ${
        selected ? "bg-[var(--brand)]/5" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(address)}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      >
        <span className="truncate font-medium text-slate-900">{address.label}</span>
        <span className="truncate text-sm text-slate-500">{address.formattedAddress}</span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(address)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        aria-label={`Borrar ${address.label}`}
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}
