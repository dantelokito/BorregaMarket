"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface PriceInputProps {
  value: number | null;
  unit: string;
  onSave: (price: number) => Promise<void>;
  disabled?: boolean;
}

export function PriceInput({ value, unit, onSave, disabled }: PriceInputProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputValue(value?.toString() ?? "");
  }, [value]);

  async function handleSave() {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      setInputValue(value?.toString() ?? "");
      setEditing(false);
      return;
    }

    if (parsed === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">$</span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setInputValue(value?.toString() ?? "");
              setEditing(false);
            }
          }}
          disabled={saving}
          autoFocus
          aria-label="Editar precio"
          className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <span className="text-sm text-gray-500">/ {unit}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="group flex items-center gap-1.5 text-left text-sm text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded"
      aria-label={value ? `Precio $${value}, clic para editar` : "Asignar precio"}
    >
      {saved && <Check size={14} className="text-green-600" aria-hidden />}
      <span>
        {value
          ? `$${value.toLocaleString("es-MX")} / ${unit}`
          : "Clic para asignar precio"}
      </span>
    </button>
  );
}
