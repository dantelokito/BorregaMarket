"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScaleAdapter,
  SCALE_DRIVERS,
  isWebSerialSupported,
  type ScaleDriver,
  type ScaleStatus,
} from "@/lib/pos/scale";

export function usePosScale(options: {
  onWeightChange: (grams: number) => void;
  onParseError?: () => void;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const adapterRef = useRef<ScaleAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new ScaleAdapter();
  }

  const [status, setStatus] = useState<ScaleStatus>(() =>
    isWebSerialSupported() ? "disconnected" : "unsupported"
  );
  const [driver, setDriver] = useState<ScaleDriver | null>(null);
  const [liveGrams, setLiveGrams] = useState<number | null>(null);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    adapter.setCallbacks({
      onWeightChange: (grams) => {
        setLiveGrams(grams);
        optionsRef.current.onWeightChange(grams);
      },
      onStatusChange: setStatus,
      onParseError: () => optionsRef.current.onParseError?.(),
      onDriverResolved: (next, matchedByUsb) => {
        setDriver(next);
        if (!matchedByUsb) setStatus("needs-driver");
      },
    });

    if (!isWebSerialSupported()) {
      setStatus("unsupported");
      return;
    }

    void adapter.connect({ reuseGranted: true });
    return () => {
      void adapter.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    await adapterRef.current?.connect();
  }, []);

  const disconnect = useCallback(async () => {
    setLiveGrams(null);
    await adapterRef.current?.disconnect();
  }, []);

  const selectDriver = useCallback((id: string) => {
    adapterRef.current?.setDriver(id);
    const next = SCALE_DRIVERS.find((d) => d.id === id) ?? null;
    setDriver(next);
    setStatus("connected");
  }, []);

  return {
    status,
    driver,
    drivers: SCALE_DRIVERS,
    liveGrams,
    connect,
    disconnect,
    selectDriver,
  };
}
