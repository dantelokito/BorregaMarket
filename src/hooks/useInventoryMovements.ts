"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  listInventoryMovements,
  type InventoryMovement,
  type InventoryMovementKind,
} from "@/lib/api/inventory";

export function useInventoryMovements(filters: {
  kind?: InventoryMovementKind;
  from?: string;
  to?: string;
  page: number;
  enabled: boolean;
}) {
  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  const refetch = useCallback(async () => {
    if (!filters.enabled) return;
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await listInventoryMovements({
        page: filters.page,
        limit: 50,
        kind: filters.kind,
        from: filters.from,
        to: filters.to,
      });
      setRows(data ?? []);
      setTotalPages(meta?.totalPages ?? 1);
    } catch (err) {
      setRows([]);
      setError(err instanceof ApiError ? err.message : "No pudimos cargar los movimientos");
    } finally {
      setLoading(false);
    }
  }, [filters.enabled, filters.page, filters.kind, filters.from, filters.to]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, error, totalPages, refetch };
}
