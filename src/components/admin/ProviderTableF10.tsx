"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import type { AdminProvider } from "@/lib/api/types";
import { updateProviderFlags } from "@/lib/api/admin";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminFlagSwitch } from "./AdminFlagSwitch";

const REVOKE_COPY =
  "Al revocar, se apagan las reseñas de Google de este negocio. El Place ID no se borra.";

export function ProviderTableF10({
  providers,
  onChange,
  onError,
}: {
  providers: AdminProvider[];
  onChange: (next: AdminProvider) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  async function patch(id: string, flags: Parameters<typeof updateProviderFlags>[1]) {
    setBusy(id);
    try {
      const { data } = await updateProviderFlags(id, flags);
      onChange(data);
    } catch (err) {
      onError(mapF10ApiError(err, "module"));
    } finally {
      setBusy(null);
    }
  }

  const pending = providers.find((p) => p.id === revokeId);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Negocio</th>
            <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-center font-semibold">Notificación</th>
            <th className="px-4 py-3 text-center font-semibold">Verificado</th>
            <th className="px-4 py-3 text-center font-semibold">Activo</th>
            <th className="px-4 py-3 text-center font-semibold">Mayoreo</th>
            <th className="px-4 py-3 text-center font-semibold">A domicilio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {providers.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium">{p.businessName}</td>
              <td className="px-4 py-3 text-gray-500">{p.city}</td>
              <td className="px-4 py-3 text-gray-500">{p.userEmail || "—"}</td>
              <td className="px-4 py-3 text-center">
                {p.hasValidEmail === false ? (
                  <span className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
                    <MailWarning size={14} aria-hidden />
                    Sin email válido
                  </span>
                ) : (
                  <span className="text-xs text-green-700">OK</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <AdminFlagSwitch
                  label={p.isVerified ? "Verificado" : "Pendiente"}
                  checked={p.isVerified}
                  disabled={busy === p.id}
                  onToggle={() => {
                    if (p.isVerified) setRevokeId(p.id);
                    else void patch(p.id, { isVerified: true });
                  }}
                />
              </td>
              <td className="px-4 py-3 text-center">
                <AdminFlagSwitch
                  label="Activo"
                  checked={p.isActive}
                  disabled={busy === p.id}
                  onToggle={() => void patch(p.id, { isActive: !p.isActive })}
                />
              </td>
              <td className="px-4 py-3 text-center">
                <AdminFlagSwitch
                  label="Mayoreo"
                  checked={p.offersWholesale === true}
                  disabled={busy === p.id}
                  onToggle={() => void patch(p.id, { offersWholesale: !p.offersWholesale })}
                />
              </td>
              <td className="px-4 py-3 text-center">
                <AdminFlagSwitch
                  label="A domicilio"
                  checked={p.offersDelivery === true}
                  disabled={busy === p.id}
                  onToggle={() => void patch(p.id, { offersDelivery: !p.offersDelivery })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Revocar verificación"
        description={REVOKE_COPY}
        confirmLabel="Revocar"
        destructive
        onCancel={() => setRevokeId(null)}
        onConfirm={() => {
          if (!pending) return;
          setRevokeId(null);
          void patch(pending.id, { isVerified: false });
        }}
      />
    </div>
  );
}
