import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LegalIncompleteAlert({ canEdit }: { canEdit: boolean }) {
  return (
    <div
      role="status"
      className="mb-6 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>
        <strong>Datos legales incompletos.</strong> El footer y las páginas legales muestran
        &quot;en actualización&quot;.{" "}
        {canEdit ? (
          <Link href="/admin?tab=legal" className="font-medium underline underline-offset-2">
            Completar datos legales
          </Link>
        ) : (
          "Pide a un administrador con permiso Legal que los complete."
        )}
      </p>
    </div>
  );
}
