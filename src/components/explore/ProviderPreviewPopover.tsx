"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

interface ProviderPreviewPopoverProps {
  providerId: string;
  anchor: HTMLElement | null;
  onClose: () => void;
  onNotFound?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function placePopover(anchor: DOMRect, flip: boolean) {
  const width = Math.min(384, window.innerWidth - 16);
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8);
  if (flip) {
    return { top: Math.max(8, anchor.top - 8), left, width, transform: "translateY(-100%)" as const };
  }
  return { top: anchor.bottom + 8, left, width, transform: "none" as const };
}

export function ProviderPreviewPopover({
  providerId,
  anchor,
  onClose,
  onNotFound,
  onMouseEnter,
  onMouseLeave,
}: ProviderPreviewPopoverProps) {
  const { showToast } = useToast();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(
    () => getCachedProviderPreview(providerId) ?? null
  );
  const [loading, setLoading] = useState(!getCachedProviderPreview(providerId));
  const [error, setError] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 384, transform: "none" });

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
    function reposition() {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const flip = spaceBelow < 280;
      setCoords(placePopover(rect, flip));
    }
    reposition();
    const scrollRoot = document.querySelector(".explore-main-scroll");
    scrollRoot?.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      scrollRoot?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [anchor]);

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

  if (typeof document === "undefined") return null;

  const instant = prefersReducedMotion();

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        transform: coords.transform,
        zIndex: 450,
      }}
      className={`flex max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
        instant ? "" : "animate-in fade-in duration-150"
      }`}
    >
      <div className="flex items-center justify-end px-3 pt-2">
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
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <Link
            href={`/fruteria/${provider.id}`}
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
          >
            Ver frutería
          </Link>
        </div>
      )}
    </div>,
    document.body
  );
}
