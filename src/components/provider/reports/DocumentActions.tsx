"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DocumentActions({
  onPrint,
  onPdf,
  pdfLoading,
  disabled,
  showPdf = true,
}: {
  onPrint: () => void;
  onPdf?: () => void;
  pdfLoading?: boolean;
  disabled?: boolean;
  showPdf?: boolean;
}) {
  return (
    <div className="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
      <Button
        type="button"
        variant="secondary"
        onClick={onPrint}
        disabled={disabled}
        className="min-h-11 w-full sm:w-auto"
      >
        <Printer size={16} aria-hidden />
        Imprimir
      </Button>
      {showPdf && onPdf && (
      <Button
        type="button"
        variant="secondary"
        onClick={onPdf}
        disabled={disabled || pdfLoading}
        loading={pdfLoading}
        loadingText="Descargando…"
        aria-busy={pdfLoading || undefined}
        className="min-h-11 w-full sm:w-auto"
      >
        <Download size={16} aria-hidden />
        Descargar PDF
      </Button>
      )}
    </div>
  );
}
