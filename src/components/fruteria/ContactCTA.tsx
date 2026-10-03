"use client";

import { Phone, MessageCircle } from "lucide-react";
import { notifyProviderContact } from "@/lib/api/providers";
import { telHref, whatsappHref } from "@/lib/phone";
import { CONTACT_TOAST_SUCCESS, notifyContactToast } from "@/lib/ui/contact-toast";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics/track";
import { PrivacyMicrocopy } from "@/components/legal/PrivacyMicrocopy";

export type ContactSource = "call_button" | "whatsapp_button" | "other";

interface ContactCTAProps {
  providerId: string;
  phone: string;
  sticky?: boolean;
  /** Compact link style for explore cards */
  variant?: "primary" | "link";
  /** When Encargar is the dominant CTA, Llamar becomes secondary */
  emphasis?: "primary" | "secondary";
  /** `bar`: una línea encima de los botones en la barra móvil. */
  notice?: "below" | "above";
  className?: string;
}

export function ContactCTA({
  providerId,
  phone,
  sticky = false,
  variant = "primary",
  emphasis = "primary",
  notice = "below",
  className = "",
}: ContactCTAProps) {
  const { showToast } = useToast();
  const tel = telHref(phone);
  const wa = whatsappHref(phone);

  function fireNotify(source: ContactSource) {
    void notifyProviderContact(providerId, { source })
      .then(({ data }) => {
        if (data.notified) {
          showToast(CONTACT_TOAST_SUCCESS, "success");
        }
      })
      .catch((err) => {
        const toast = notifyContactToast(err);
        if (toast) showToast(toast.message, toast.variant);
      });
  }

  function handleCall(e: React.MouseEvent) {
    track("contact_click", { providerId, source: "call_button" });
    fireNotify("call_button");
    if (!tel) e.preventDefault();
  }

  function handleWhatsApp() {
    track("contact_click", { providerId, source: "whatsapp_button" });
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

  const privacy = wa ? (
    <div className={notice === "above" ? "mb-2" : "mt-2"}>
      <PrivacyMicrocopy variant={notice === "above" || sticky ? "whatsapp-sticky" : "whatsapp"} />
    </div>
  ) : null;

  if (sticky) {
    return (
      <div
        className={`fixed bottom-[var(--cookie-notice-offset,0px)] left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 lg:hidden ${className}`}
      >
        {privacy}
        <div className="flex gap-2">
          {primaryBtn}
          {waBtn}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {notice === "above" ? privacy : null}
      <div className="flex flex-wrap gap-2">
        {primaryBtn}
        {waBtn}
      </div>
      {notice === "below" ? privacy : null}
    </div>
  );
}
