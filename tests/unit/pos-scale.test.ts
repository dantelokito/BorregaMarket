import { describe, expect, it } from "vitest";
import {
  FTDI_VENDOR_ID,
  LineBuffer,
  PROLIFIC_VENDOR_ID,
  gramsToQuantity,
  parseGenericStableLine,
  resolveDriver,
} from "@/lib/pos/scale";

describe("parseGenericStableLine", () => {
  it("parses A&D-style kg lines to grams", () => {
    expect(parseGenericStableLine("ST,GS,+  1.250kg\r\n")).toEqual({ grams: 1250 });
    expect(parseGenericStableLine("1.250 kg")).toEqual({ grams: 1250 });
    expect(parseGenericStableLine("WN001.250kg")).toEqual({ grams: 1250 });
  });

  it("parses gram units", () => {
    expect(parseGenericStableLine("250 g")).toEqual({ grams: 250 });
    expect(parseGenericStableLine("250gr")).toEqual({ grams: 250 });
  });

  it("accepts comma decimals", () => {
    expect(parseGenericStableLine("0,500 kg")).toEqual({ grams: 500 });
  });

  it("returns null for invalid or unstable lines", () => {
    expect(parseGenericStableLine("")).toBeNull();
    expect(parseGenericStableLine("ERROR")).toBeNull();
    expect(parseGenericStableLine("US,GS,+  1.250kg")).toBeNull();
  });
});

describe("LineBuffer", () => {
  it("splits on CRLF and leftover remainder", () => {
    const buf = new LineBuffer();
    expect(buf.push("ST,GS,+  1.000kg\r\nST,GS,+  ")).toEqual(["ST,GS,+  1.000kg"]);
    expect(buf.push("1.100kg\n")).toEqual(["ST,GS,+  1.100kg"]);
  });
});

describe("gramsToQuantity", () => {
  it("converts KG and GR with 3 decimals", () => {
    expect(gramsToQuantity(1250, "KG")).toBe(1.25);
    expect(gramsToQuantity(1250, "GR")).toBe(1250);
    expect(gramsToQuantity(333, "KG")).toBe(0.333);
  });

  it("does not convert PZA", () => {
    expect(gramsToQuantity(1250, "PZA")).toBeNull();
  });
});

describe("resolveDriver", () => {
  it("maps FTDI and Prolific vendor ids", () => {
    expect(resolveDriver(FTDI_VENDOR_ID, 0x6001).driver.id).toBe("ftdi-generic");
    expect(resolveDriver(FTDI_VENDOR_ID, 0x6001).matchedByUsb).toBe(true);
    expect(resolveDriver(PROLIFIC_VENDOR_ID, 0x2303).driver.id).toBe("prolific-generic");
  });

  it("falls back to generic-stable or saved preference", () => {
    const unknown = resolveDriver(0x1234, 0x0001);
    expect(unknown.driver.id).toBe("generic-stable");
    expect(unknown.matchedByUsb).toBe(false);

    const preferred = resolveDriver(0x1234, 0x0001, "ftdi-generic");
    expect(preferred.driver.id).toBe("ftdi-generic");
    expect(preferred.matchedByUsb).toBe(false);
  });
});
