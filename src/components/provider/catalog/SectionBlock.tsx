"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProviderSection } from "@/lib/api/types";

const DELETE_COPY = "Mueve los productos a otra sección antes de eliminarla";

export function SectionBlock({
  section,
  productCount,
  isFirst,
  isLast,
  children,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  section: ProviderSection;
  productCount: number;
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
  onRename: (name: string) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [saving, setSaving] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canDelete = productCount === 0;

  useEffect(() => {
    setName(section.name);
  }, [section.name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === section.name) {
      setName(section.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <label htmlFor={inputId} className="sr-only">
                Nombre de sección
              </label>
              <input
                ref={inputRef}
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") {
                    setName(section.name);
                    setEditing(false);
                  }
                }}
                disabled={saving}
                className="min-h-11 w-full max-w-sm rounded-lg border border-gray-300 px-3 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{section.name}</h2>
              <span className="text-sm text-slate-500">
                {productCount} {productCount === 1 ? "producto" : "productos"}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            aria-label={`Renombrar ${section.name}`}
            className="min-h-11 min-w-11 px-3"
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Subir ${section.name}`}
            className="min-h-11 min-w-11 px-3"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ArrowUp size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Bajar ${section.name}`}
            className="min-h-11 min-w-11 px-3"
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ArrowDown size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Eliminar ${section.name}`}
            title={canDelete ? "Eliminar sección" : DELETE_COPY}
            className="min-h-11 min-w-11 px-3 text-red-700 hover:bg-red-50"
            disabled={!canDelete}
            onClick={onDelete}
          >
            <Trash2 size={16} aria-hidden />
          </Button>
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
