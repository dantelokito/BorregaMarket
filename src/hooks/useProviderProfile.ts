"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getMyBusiness, updateProviderSettings, uploadProviderMedia } from "@/lib/api/provider-panel";
import type { ProviderBusiness } from "@/lib/api/types";
import { mapF10ApiError } from "@/lib/ui/f10-errors";

export function useProviderProfile() {
  const [business, setBusiness] = useState<ProviderBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMyBusiness();
      setBusiness(data);
    } catch (err) {
      setBusiness(null);
      setError(mapF10ApiError(err, "business") || (err instanceof ApiError ? err.message : "No pudimos cargar el perfil"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const patch = useCallback(async (input: Parameters<typeof updateProviderSettings>[0]) => {
    const { data } = await updateProviderSettings(input);
    setBusiness(data);
    return data;
  }, []);

  const uploadMedia = useCallback(async (field: "logo" | "cover", file: File) => {
    const { data } = await uploadProviderMedia(field, file);
    setBusiness((prev) =>
      prev
        ? {
            ...prev,
            logoUrl: field === "logo" ? data.url : prev.logoUrl,
            coverUrl: field === "cover" ? data.url : prev.coverUrl,
          }
        : prev
    );
    return data.url;
  }, []);

  return { business, loading, error, refetch, patch, uploadMedia, setBusiness };
}
