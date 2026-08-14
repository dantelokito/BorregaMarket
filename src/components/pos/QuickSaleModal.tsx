"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuantityInput } from "./QuantityInput";
import { UnitSelector } from "./UnitSelector";
import { parseDecimalInput } from "@/lib/format";
import type { UnitOfMeasure } from "@/lib/api/types";

export interface QuickSaleDraft {
  name: string;
  unitPrice: string;
  quantity: string;
  unitOfMeasure: UnitOfMeasure;
}

interface QuickSaleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (draft: QuickSaleDraft) => void;
}

export function QuickSaleModal({ open, onClose, onAdd }: QuickSaleModalProps) {
  const titleId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<UnitOfMeasure>("PZA");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName("");
      setUnitPrice("");
      setQuantity("1");
      setUnit("PZA");
      setErrors({});
      setTimeout(() => firstRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      next.name = "Escribe un nombre (1–80 caracteres)";
    }
    const price = parseDecimalInput(unitPrice);
    if (price == null || price <= 0 || price > 99999.99) {
      next.unitPrice = "Precio inválido";
    }
    const qty = parseDecimalInput(quantity);
    if (qty == null || qty <= 0) {
      next.quantity = "Cantidad inválida (máximo 3 decimales)";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      const first = Object.keys(next)[0];
      document.getElementById(first === "name" ? "quick-name" : first === "unitPrice" ? "quick-price" : "pos-qty")?.focus();
      return;
    }
    onAdd({ name: trimmed, unitPrice, quantity, unitOfMeasure: unit });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-xl bg-white p-6 shadow-lg sm:rounded-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Venta rápida
        </h2>
        <p className="mt-1 text-sm text-slate-500">No se agrega al catálogo ni a la vitrina.</p>
        <div className="mt-4 space-y-4">
          <Input
            ref={firstRef}
            id="quick-name"
            label="Producto"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            maxLength={80}
          />
          <Input
            id="quick-price"
            label="Precio unitario"
            name="unitPrice"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            error={errors.unitPrice}
          />
          <QuantityInput value={quantity} onChange={setQuantity} error={errors.quantity} />
          <UnitSelector value={unit} onChange={setUnit} />
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Agregar al ticket
          </Button>
        </div>
      </form>
    </div>
  );
}
