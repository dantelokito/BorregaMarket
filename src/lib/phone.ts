/** Normalize MX phone for tel: / wa.me links */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  return `tel:${digitsOnly(phone)}`;
}

/** Build WhatsApp deep link; assumes MX (+52) when 10 digits */
export function whatsappHref(phone: string): string | null {
  let digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}
