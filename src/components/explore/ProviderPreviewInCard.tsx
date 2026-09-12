"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getProviderById } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import {
  abortProviderPreviewFetch,
  beginProviderPreviewFetch,
  endProviderPreviewFetch,
  getCachedProviderPreview,
  setCachedProviderPreview,
} from "@/lib/maps/preview-cache";
import { prefersReducedMotion } from "@/lib/maps/preview-delays";
import type { ProviderDetail } from "@/lib/api/types";
import { ProviderPreviewContent } from "./ProviderPreviewContent";

interface ProviderPreviewInCardProps {
  providerId: string;
  onClose: () => void;
  onNotFound?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function ProviderPreviewInCard({
  providerId,
  onClose,
  onNotFound,
  onMouseEnter,
  onMouseLeave,
}: ProviderPreviewInCardProps) {
  const { showToast } = useToast();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(
    () => getCachedProviderPreview(providerId) ?? null
  );
  const [loading, setLoading] = useState(!getCachedProviderPreview(providerId));
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => prefersReducedMotion());

  const load = useCallback(async () => {
    const cached = getCachedProviderPreview(providerId);
    if (cached) {
      setProvider(cached);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const controller = beginProviderPreviewFetch(providerId);
    try {
      const { data } = await getProviderById(providerId);
      if (controller.signal.aborted) return;
      setCachedProviderPreview(providerId, data);
      setProvider(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 404) {
        showToast("Esta frutería no está disponible", "error");
        onNotFound?.();
        onClose();
        return;
      }
      setError(err instanceof ApiError ? err.message : "No pudimos cargar la frutería");
    } finally {
      endProviderPreviewFetch(providerId);
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [providerId, onClose, onNotFound, showToast]);

  useEffect(() => {
    void load();
    return () => abortProviderPreviewFetch();
  }, [load]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.requestAnimationFrame(() => setExpanded(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="region"
      aria-labelledby={titleId}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-expanded={expanded}
      className="provider-preview-overlay absolute inset-0 z-10 flex flex-col bg-white/95 backdrop-blur-sm"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end px-3 pt-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <X size={18} aria-hidden />
            <span className="ml-1">Cerrar</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <ProviderPreviewContent
            provider={provider}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            titleId={titleId}
          />
        </div>
        {provider && !loading && !error && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <Link
              href={`/fruteria/${provider.id}`}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
            >
              Ver frutería
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
