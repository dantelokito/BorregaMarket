"use client";

import { LoaderCircle } from "lucide-react";

export function AdminFlagSwitch({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={label}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60 ${
        checked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {disabled ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}
