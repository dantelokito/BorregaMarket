import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  CONTACT_TOAST_500,
  CONTACT_TOAST_503,
  notifyContactToast,
} from "@/lib/ui/contact-toast";

describe("notifyContactToast", () => {
  it("silences 429", () => {
    expect(notifyContactToast(new ApiError("rate limit", 429))).toBeNull();
  });

  it("uses dedicated 503 copy", () => {
    expect(notifyContactToast(new ApiError("unavailable", 503))).toEqual({
      message: CONTACT_TOAST_503,
      variant: "error",
    });
    expect(CONTACT_TOAST_503).toBe(
      "El aviso a la frutería no está disponible. Puedes llamar igual."
    );
  });

  it("uses 500 copy for other ApiError and network TypeError", () => {
    expect(notifyContactToast(new ApiError("boom", 500))).toEqual({
      message: CONTACT_TOAST_500,
      variant: "error",
    });
    expect(notifyContactToast(new TypeError("Failed to fetch"))).toEqual({
      message: CONTACT_TOAST_500,
      variant: "error",
    });
    expect(CONTACT_TOAST_500).toBe(
      "No pudimos avisar a la frutería. Puedes llamar igual."
    );
  });

  it("ignores unrelated errors", () => {
    expect(notifyContactToast(new Error("unexpected"))).toBeNull();
  });
});
