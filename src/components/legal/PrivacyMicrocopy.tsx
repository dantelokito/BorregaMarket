import { LegalExternalLink } from "./LegalExternalLink";

type PrivacyMicrocopyProps =
  | { variant: "address" | "geo" | "whatsapp" }
  | { variant: "whatsapp-sticky" };

export function PrivacyMicrocopy(props: PrivacyMicrocopyProps) {
  if (props.variant === "whatsapp-sticky") {
    return (
      <p className="truncate text-xs leading-5 text-slate-600">
        WhatsApp comparte tu número con la frutería ·{" "}
        <LegalExternalLink href="/legal/privacidad">Privacidad</LegalExternalLink>
      </p>
    );
  }

  const copy = {
    address: "Guardamos esta dirección para calcular distancias y entregas de tus pedidos.",
    geo: "Usamos tu ubicación aproximada solo para mostrar fruterías cercanas.",
    whatsapp: "Al escribir por WhatsApp compartes tu número con la frutería y con Meta.",
  }[props.variant];

  return (
    <p className="text-xs leading-5 text-slate-600">
      {copy} <LegalExternalLink href="/legal/privacidad">Aviso de Privacidad</LegalExternalLink>
    </p>
  );
}
