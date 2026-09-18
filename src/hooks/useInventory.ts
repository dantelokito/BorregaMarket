"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  listInventory,
  patchInventoryItem,
  postInventoryAdjustment,
  postInventoryEntry,
  postInventoryShrinkage,
  type InventoryItem,
  type PatchInventoryInput,
  type ShrinkageReason,
} from "@/lib/api/inventory";

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listInventory(1, 100);
      setItems(data ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof ApiError ? err.message : "No pudimos cargar el inventario"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}

export function useInventoryMutations(onDone: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submitEntry = useCallback(
    async (providerProductId: string, quantity: string) => {
      setBusy(true);
      setFormError("");
      setFieldErrors({});
      try {
        await postInventoryEntry(providerProductId, {
          quantity,
          receiveAs: "CATALOG",
        });
        await onDone();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          const mapped: Record<string, string> = {};
          for (const d of err.details ?? []) {
            if (d.field) mapped[d.field] = d.message;
          }
          setFieldErrors(mapped);
          setFormError(err.message);
        } else {
          setFormError("No se registró la entrada");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  const submitFicha = useCallback(
    async (providerProductId: string, input: PatchInventoryInput) => {
      setBusy(true);
      setFormError("");
      setFieldErrors({});
      try {
        await patchInventoryItem(providerProductId, input);
        await onDone();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          const mapped: Record<string, string> = {};
          for (const d of err.details ?? []) {
            if (d.field) mapped[d.field] = d.message;
          }
          setFieldErrors(mapped);
          setFormError(err.message);
        } else {
          setFormError("No se guardó la ficha");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  const submitShrinkage = useCallback(
    async (
      providerProductId: string,
      input: { quantity: string; reason: ShrinkageReason; note?: string }
    ) => {
      setBusy(true);
      setFormError("");
      setFieldErrors({});
      try {
        await postInventoryShrinkage(providerProductId, input);
        await onDone();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          const mapped: Record<string, string> = {};
          for (const d of err.details ?? []) {
            if (d.field) mapped[d.field] = d.message;
          }
          setFieldErrors(mapped);
          setFormError(err.message);
        } else {
          setFormError("No se registró la merma");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  const submitAdjustment = useCallback(
    async (providerProductId: string, input: { countedOnHand: string; note?: string }) => {
      setBusy(true);
      setFormError("");
      setFieldErrors({});
      try {
        await postInventoryAdjustment(providerProductId, input);
        await onDone();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          const mapped: Record<string, string> = {};
          for (const d of err.details ?? []) {
            if (d.field) mapped[d.field] = d.message;
          }
          setFieldErrors(mapped);
          setFormError(err.message);
        } else {
          setFormError("No se registró el ajuste");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone]
  );

  return {
    busy,
    formError,
    fieldErrors,
    setFieldErrors,
    submitEntry,
    submitFicha,
    submitShrinkage,
    submitAdjustment,
  };
}
