import { ApiError } from "@/lib/api/client";

export const CONTACT_TOAST_SUCCESS = "La frutería fue notificada";
export const CONTACT_TOAST_503 =
  "El aviso a la frutería no está disponible. Puedes llamar igual.";
export const CONTACT_TOAST_500 =
  "No pudimos avisar a la frutería. Puedes llamar igual.";

export type ContactToastResult = {
  message: string;
  variant: "success" | "error";
} | null;

/** Toast for POST /contact. 429 = silence. 503 ≠ 500. Other errors ignored. */
export function notifyContactToast(err: unknown): ContactToastResult {
  if (err instanceof ApiError && err.status === 429) {
    return null;
  }
  if (err instanceof ApiError && err.status === 503) {
    return { message: CONTACT_TOAST_503, variant: "error" };
  }
  if (err instanceof ApiError || err instanceof TypeError) {
    return { message: CONTACT_TOAST_500, variant: "error" };
  }
  return null;
}
