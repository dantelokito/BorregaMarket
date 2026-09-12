"use client";

import { useEffect, useState } from "react";
import type { UserAddress } from "@/lib/api/types";
import { LocationChip } from "./LocationChip";
import { LocationPanel } from "./LocationPanel";
import { SaveAddressDialog } from "./SaveAddressDialog";
import { DeleteAddressDialog } from "./DeleteAddressDialog";

function useIsMd() {
  const [isMd, setIsMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isMd;
}

interface LocationBarProps {
  chipLabel: string;
  onSearchAddress: (query: string) => Promise<void>;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: UserAddress) => void;
  onSaveAddress: (label: string) => Promise<void>;
  onRequestLogin: () => void;
  onDeleteAddress: (address: UserAddress) => Promise<void>;
  canSave: boolean;
  guest: boolean;
  /** Inline chip for ExploreChromeF9 single bar. */
  inline?: boolean;
}

export function LocationBar({
  chipLabel,
  onSearchAddress,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSaveAddress,
  onRequestLogin,
  onDeleteAddress,
  canSave,
  guest,
  inline = false,
}: LocationBarProps) {
  const isMd = useIsMd();
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<UserAddress | null>(null);

  const atLimit = addresses.length >= 20;

  function requestSave() {
    if (guest) {
      onRequestLogin();
      return;
    }
    if (!canSave || atLimit) return;
    setSaveError("");
    setSaveOpen(true);
  }

  async function confirmSave(label: string) {
    setSaving(true);
    setSaveError("");
    try {
      await onSaveAddress(label);
      setSaveOpen(false);
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("límite") || message.includes("20")) {
        setSaveError("Llegaste al límite de 20 direcciones. Quita una para guardar otra.");
      } else {
        setSaveError("No pudimos guardar la dirección. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  const chipBlock = (
    <div className={`relative ${inline ? "shrink-0" : ""}`}>
      <LocationChip label={chipLabel} expanded={open} onToggle={() => setOpen((v) => !v)} />
      {open && (
        <LocationPanel
          variant={isMd ? "popover" : "sheet"}
          onClose={() => setOpen(false)}
          onSearchAddress={onSearchAddress}
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={onSelectAddress}
          onDeleteAddress={setPendingDelete}
          onSaveAddress={requestSave}
          canSave={canSave}
          guest={guest}
          atLimit={atLimit}
        />
      )}
    </div>
  );

  const dialogs = (
    <>
      <SaveAddressDialog
        open={saveOpen}
        previewAddress={chipLabel}
        initialLabel={chipLabel.slice(0, 40) || "Casa"}
        saving={saving}
        error={saveError}
        onSave={(label) => void confirmSave(label)}
        onCancel={() => setSaveOpen(false)}
      />
      <DeleteAddressDialog
        open={Boolean(pendingDelete)}
        label={pendingDelete?.label ?? ""}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          setPendingDelete(null);
          void onDeleteAddress(target);
        }}
      />
    </>
  );

  if (inline) {
    return (
      <>
        {chipBlock}
        {dialogs}
      </>
    );
  }

  return (
    <section className="space-y-2 border-b border-gray-100 bg-white px-4 py-2 sm:px-6 sm:py-3">
      {chipBlock}
      {dialogs}
    </section>
  );
}
