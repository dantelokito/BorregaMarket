"use client";

import { Phone, MessageCircle } from "lucide-react";
import { notifyProviderContact } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import { telHref, whatsappHref } from "@/lib/phone";
import { useToast } from "@/components/ui/Toast";

export type ContactSource = "call_button" | "whatsapp_button" | "other";

interface ContactCTAProps {
  providerId: string;
  phone: string;
  sticky?: boolean;
  /** Compact link style for explore cards */
  variant?: "primary" | "link";
  /** When Encargar is the dominant CTA, Llamar becomes secondary */
  emphasis?: "primary" | "secondary";
  className?: string;
}

export function ContactCTA({
  providerId,
  phone,
  sticky = false,
  variant = "primary",
  emphasis = "primary",
  className = "",
}: ContactCTAProps) {
  const { showToast } = useToast();
  const tel = telHref(phone);
  const wa = whatsappHref(phone);

  function fireNotify(source: ContactSource) {
    void notifyProviderContact(providerId, { source })
      .then(({ data }) => {
        if (data.notified) {
          showToast("La frutería fue notificada", "success");
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 429) {
          return;
        }
        if (err instanceof ApiError || err instanceof TypeError) {
          showToast("No pudimos notificar a la frutería", "error");
        }
      });
  }

  function handleCall(e: React.MouseEvent) {
    fireNotify("call_button");
    if (!tel) e.preventDefault();
  }

  function handleWhatsApp() {
    fireNotify("whatsapp_button");
  }

  if (variant === "link") {
    return (
      <a
        href={tel}
        onClick={handleCall}
        className={`mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline ${className}`}
      >
        <Phone size={14} aria-hidden />
        Contactar
      </a>
    );
  }

  const callClass =
    emphasis === "secondary"
      ? "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      : "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 py-3 font-semibold text-white hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

  const primaryBtn = (
    <a href={tel} onClick={handleCall} className={callClass}>
      <Phone size={18} aria-hidden />
      Llamar
    </a>
  );

  const waBtn = wa ? (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleWhatsApp}
      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      <MessageCircle size={18} aria-hidden />
      WhatsApp
    </a>
  ) : null;

  if (sticky) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 lg:hidden ${className}`}
      >
        <div className="flex gap-2">
          {primaryBtn}
          {waBtn}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {primaryBtn}
      {waBtn}
    </div>
  );
}
