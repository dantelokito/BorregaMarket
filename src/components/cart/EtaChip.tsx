import type { ProviderEta } from "@/lib/api/types";
import { ETA_DISCLAIMER, etaChipLabel } from "@/lib/ui/eta-copy";

export function EtaChip({ eta, className = "" }: { eta: ProviderEta; className?: string }) {
  const minutes = eta.copyKey === "eta_prep_only" ? eta.preparationTimeMinutes : eta.etaMinutes;
  return (
    <div className={`inline-flex flex-col items-start gap-0.5 text-sm ${className}`}>
      <span className="inline-flex items-center gap-1.5 font-medium">
        {etaChipLabel(eta.copyKey, minutes)}
      </span>
      <span className="text-xs text-slate-400">{ETA_DISCLAIMER}</span>
    </div>
  );
}
