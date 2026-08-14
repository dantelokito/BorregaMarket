import type { ScaleDriver } from "./types";
import { DRIVER_STORAGE_KEY } from "./types";
import { parseGenericStableChunk } from "./parsers";

export const FTDI_VENDOR_ID = 0x0403;
export const PROLIFIC_VENDOR_ID = 0x067b;

export const SCALE_DRIVERS: ScaleDriver[] = [
  {
    id: "generic-stable",
    label: "Báscula genérica (ASCII)",
    transport: "webserial",
    parse: parseGenericStableChunk,
  },
  {
    id: "ftdi-generic",
    label: "FTDI USB-Serial (genérico)",
    usbVendorId: FTDI_VENDOR_ID,
    usbProductId: 0x6001,
    transport: "webserial",
    parse: parseGenericStableChunk,
  },
  {
    id: "prolific-generic",
    label: "Prolific USB-Serial (genérico)",
    usbVendorId: PROLIFIC_VENDOR_ID,
    usbProductId: 0x2303,
    transport: "webserial",
    parse: parseGenericStableChunk,
  },
];

export function getDriverById(id: string | null | undefined): ScaleDriver | undefined {
  if (!id) return undefined;
  return SCALE_DRIVERS.find((d) => d.id === id);
}

export function getSavedDriverId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DRIVER_STORAGE_KEY);
}

export function saveDriverId(id: string): void {
  localStorage.setItem(DRIVER_STORAGE_KEY, id);
}

export function resolveDriver(
  vendorId?: number,
  productId?: number,
  savedId?: string | null
): { driver: ScaleDriver; matchedByUsb: boolean } {
  const byUsb = SCALE_DRIVERS.find(
    (d) =>
      d.usbVendorId != null &&
      d.usbProductId != null &&
      d.usbVendorId === vendorId &&
      d.usbProductId === productId
  );
  if (byUsb) return { driver: byUsb, matchedByUsb: true };
  const saved = getDriverById(savedId);
  if (saved) return { driver: saved, matchedByUsb: false };
  return { driver: SCALE_DRIVERS[0], matchedByUsb: false };
}
