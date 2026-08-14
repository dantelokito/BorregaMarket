import { LineBuffer } from "@/lib/pos/scale/parsers";
import {
  getSavedDriverId,
  resolveDriver,
  saveDriverId,
  getDriverById,
} from "@/lib/pos/scale/registry";
import {
  DEFAULT_BAUD,
  PARSE_FAIL_LIMIT,
  type ScaleAdapterCallbacks,
  type ScaleDriver,
  type ScaleStatus,
} from "@/lib/pos/scale/types";

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.serial);
}

export class ScaleAdapter {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private running = false;
  private lineBuffer = new LineBuffer();
  private parseFailures = 0;
  private driver: ScaleDriver | null = null;
  private callbacks: ScaleAdapterCallbacks | null = null;
  private decoder = new TextDecoder();
  private onPortDisconnect = () => {
    void this.handleDisconnect();
  };

  getDriver(): ScaleDriver | null {
    return this.driver;
  }

  setCallbacks(callbacks: ScaleAdapterCallbacks) {
    this.callbacks = callbacks;
  }

  private emitStatus(status: ScaleStatus) {
    this.callbacks?.onStatusChange?.(status);
  }

  setDriver(id: string): boolean {
    const next = getDriverById(id);
    if (!next) return false;
    this.driver = next;
    this.parseFailures = 0;
    saveDriverId(id);
    this.callbacks?.onDriverResolved?.(next, false);
    if (this.running) this.emitStatus("connected");
    return true;
  }

  async connect(options?: { reuseGranted?: boolean }): Promise<boolean> {
    if (!isWebSerialSupported() || !navigator.serial) {
      this.emitStatus("unsupported");
      return false;
    }

    this.emitStatus("connecting");
    try {
      let port: SerialPort | undefined;
      if (options?.reuseGranted) {
        const granted = await navigator.serial.getPorts();
        port = granted[0];
        if (!port) {
          this.emitStatus("disconnected");
          return false;
        }
      } else {
        port = await navigator.serial.requestPort();
      }

      await this.openPort(port);
      return true;
    } catch {
      this.emitStatus("disconnected");
      return false;
    }
  }

  private async openPort(port: SerialPort) {
    if (this.port) {
      await this.disconnect();
    }

    this.port = port;
    await port.open({
      baudRate: DEFAULT_BAUD,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });

    const info = port.getInfo();
    const resolved = resolveDriver(
      info.usbVendorId,
      info.usbProductId,
      getSavedDriverId()
    );
    this.driver = resolved.driver;
    if (resolved.matchedByUsb) {
      saveDriverId(resolved.driver.id);
    }
    this.callbacks?.onDriverResolved?.(resolved.driver, resolved.matchedByUsb);
    this.parseFailures = 0;
    this.lineBuffer.reset();
    this.running = true;
    port.addEventListener("disconnect", this.onPortDisconnect);
    this.emitStatus(resolved.matchedByUsb ? "connected" : "needs-driver");
    void this.readLoop();
  }

  private async readLoop() {
    if (!this.port?.readable) return;
    this.reader = this.port.readable.getReader();
    try {
      while (this.running) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;
        const text = this.decoder.decode(value, { stream: true });
        const lines = this.lineBuffer.push(text);
        for (const line of lines) {
          this.handleLine(line);
        }
      }
    } catch {
      if (this.running) {
        await this.handleDisconnect();
      }
    } finally {
      try {
        this.reader?.releaseLock();
      } catch {
        /* already released */
      }
      this.reader = null;
    }
  }

  private handleLine(line: string) {
    if (!this.driver) return;
    const bytes = new TextEncoder().encode(line);
    const parsed = this.driver.parse(bytes);
    if (parsed) {
      this.parseFailures = 0;
      if (parsed.grams > 0) {
        this.callbacks?.onWeightChange(parsed.grams);
      }
      return;
    }
    this.parseFailures += 1;
    if (this.parseFailures >= PARSE_FAIL_LIMIT) {
      this.callbacks?.onParseError?.();
      this.emitStatus("needs-driver");
    }
  }

  private async handleDisconnect() {
    this.running = false;
    await this.closePort();
    this.emitStatus("disconnected");
  }

  async disconnect(): Promise<void> {
    this.running = false;
    await this.closePort();
    this.emitStatus("disconnected");
  }

  private async closePort() {
    this.lineBuffer.reset();
    this.parseFailures = 0;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        /* ignore */
      }
      try {
        this.reader.releaseLock();
      } catch {
        /* ignore */
      }
      this.reader = null;
    }
    if (this.port) {
      this.port.removeEventListener("disconnect", this.onPortDisconnect);
      try {
        await this.port.close();
      } catch {
        /* already closed */
      }
      this.port = null;
    }
  }
}
