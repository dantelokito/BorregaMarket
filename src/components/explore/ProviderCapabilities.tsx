import { CreditCard, MessageCircle, Truck } from "lucide-react";
import type { ProviderDetail } from "@/lib/api/types";

const CHIP = "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800";

/** Flags are only affirmed when the contract says true (WhatsApp also needs a phone). */
export function CapabilityIcons({ provider }: { provider: ProviderDetail }) {
  const items: { key: string; label: string; icon: React.ReactNode }[] = [];

  if (provider.offersDelivery === true) {
    items.push({ key: "delivery", label: "Envío a domicilio", icon: <Truck size={14} aria-hidden /> });
  }
  if (provider.acceptsCardAtStore === true) {
    items.push({
      key: "card",
      label: "Pago con tarjeta en sucursal",
      icon: <CreditCard size={14} aria-hidden />,
    });
  }
  if (provider.whatsappEnabled === true && provider.phone) {
    items.push({
      key: "whatsapp",
      label: "WhatsApp disponible",
      icon: <MessageCircle size={14} aria-hidden />,
    });
  }

  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.key} className={CHIP} aria-label={item.label}>
          {item.icon}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function WholesaleRetailChips({ provider }: { provider: ProviderDetail }) {
  const items: string[] = [];
  if (provider.offersWholesale === true) items.push("Mayoreo");
  if (provider.offersRetail === true) items.push("Menudeo");
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((label) => (
        <li key={label} className={CHIP}>
          {label}
        </li>
      ))}
    </ul>
  );
}
