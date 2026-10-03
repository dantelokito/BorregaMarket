"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readMeasurement, writeMeasurement, type MeasurementValue } from "@/lib/analytics/measurement";

interface MeasurementContextValue {
  preference: MeasurementValue;
  hydrated: boolean;
  storageAvailable: boolean;
  dialogOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  choose: (value: "on" | "off") => { persisted: boolean };
}

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

export function MeasurementProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<MeasurementValue>("absent");
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const current = readMeasurement();
    setPreference(current.value);
    setStorageAvailable(current.persistent);
    setHydrated(true);
  }, []);

  const choose = useCallback((value: "on" | "off") => {
    const result = writeMeasurement(value);
    setPreference(value);
    setStorageAvailable(result.persisted);
    return result;
  }, []);

  const value = useMemo<MeasurementContextValue>(
    () => ({
      preference,
      hydrated,
      storageAvailable,
      dialogOpen,
      openPreferences: () => setDialogOpen(true),
      closePreferences: () => setDialogOpen(false),
      choose,
    }),
    [preference, hydrated, storageAvailable, dialogOpen, choose]
  );

  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

export function useMeasurement() {
  const ctx = useContext(MeasurementContext);
  if (!ctx) throw new Error("useMeasurement requiere MeasurementProvider");
  return ctx;
}
