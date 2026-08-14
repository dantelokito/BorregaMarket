/** Normalize MX phone for tel: / wa.me links */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  return `tel:${digitsOnly(phone)}`;
}

/** E.164 without plus. MX (+52) when 10 digits. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** Build WhatsApp deep link; assumes MX (+52) when 10 digits */
export function whatsappHref(phone: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164}`;
}
