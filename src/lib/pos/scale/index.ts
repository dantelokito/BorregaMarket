export type {
  ScaleAdapterCallbacks,
  ScaleDriver,
  ScaleParseResult,
  ScaleStatus,
  ScaleTransport,
} from "@/lib/pos/scale/types";
export {
  DRIVER_STORAGE_KEY,
  PARSE_FAIL_LIMIT,
  DEFAULT_BAUD,
} from "@/lib/pos/scale/types";
export { LineBuffer, parseGenericStableLine, parseGenericStableChunk } from "@/lib/pos/scale/parsers";
export { gramsToQuantity, isWeighableUnit } from "@/lib/pos/scale/convert";
export {
  FTDI_VENDOR_ID,
  PROLIFIC_VENDOR_ID,
  SCALE_DRIVERS,
  getDriverById,
  getSavedDriverId,
  saveDriverId,
  resolveDriver,
} from "@/lib/pos/scale/registry";
export { ScaleAdapter, isWebSerialSupported } from "@/lib/pos/scale/ScaleAdapter";
