export type ScaleTransport = "webserial" | "webhid";

export type ScaleStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "unsupported"
  | "needs-driver";

export type ScaleParseResult = { grams: number } | null;

export interface ScaleDriver {
  id: string;
  label: string;
  usbVendorId?: number;
  usbProductId?: number;
  transport: ScaleTransport;
  parse: (chunk: Uint8Array) => ScaleParseResult;
}

export interface ScaleAdapterCallbacks {
  onWeightChange: (grams: number) => void;
  onStatusChange?: (status: ScaleStatus) => void;
  onParseError?: () => void;
  onDriverResolved?: (driver: ScaleDriver, matchedByUsb: boolean) => void;
}

export const DRIVER_STORAGE_KEY = "lbm.scale.driverId";
export const SCALE_DRIVER_STORAGE_KEY = DRIVER_STORAGE_KEY;
export const PARSE_FAIL_LIMIT = 8;
export const DEFAULT_BAUD = 9600;
