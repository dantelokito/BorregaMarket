"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, Star, MapPin } from "lucide-react";
import type { ProviderListing } from "@/types";
import { ContactCTA } from "@/components/fruteria/ContactCTA";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { previewDelays } from "@/lib/maps/preview-delays";
import {
  distanceRatio,
  formatCardEta,
  formatSearchDistance,
} from "@/lib/ui/explore-distance";
import { ProviderPreviewInCard } from "./ProviderPreviewInCard";

interface ProviderCardProps {
  provider: ProviderListing;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  previewOpen: boolean;
  onPreviewOpen: () => void;
  onPreviewClose: () => void;
  onPreviewNotFound?: () => void;
  /** Radio activo del pin (Should barra). */
  radiusKm?: number | null;
  hasPin?: boolean;
}

function scrollCardIntoViewIfNeeded(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const margin = 16;
  const outOfView =
    rect.top < margin || rect.bottom > window.innerHeight - margin;
  if (outOfView) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

export function ProviderCard({
  provider,
  isHovered,
  onHover,
  onLeave,
  previewOpen,
  onPreviewOpen,
  onPreviewClose,
  onPreviewNotFound,
  radiusKm = null,
  hasPin = false,
}: ProviderCardProps) {
  const imageSrc = provider.coverUrl ?? provider.logoUrl;
  const [imgError, setImgError] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number>(0);
  const closeTimer = useRef<number>(0);
  const pressTimer = useRef<number>(0);
  const suppressClick = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(pressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!previewOpen || !shellRef.current) return;
    scrollCardIntoViewIfNeeded(shellRef.current);
  }, [previewOpen]);

  function clearTimers() {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(pressTimer.current);
  }

  function scheduleOpen() {
    const { open } = previewDelays();
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    openTimer.current = window.setTimeout(() => onPreviewOpen(), open);
  }

  function scheduleClose() {
    const { close } = previewDelays();
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => onPreviewClose(), close);
  }

  function cancelClose() {
    window.clearTimeout(closeTimer.current);
  }

  const distanceKm = typeof provider.distanceKm === "number" ? provider.distanceKm : null;
  const showDistance = hasPin && distanceKm != null;
  const ratio =
    showDistance && radiusKm != null && radiusKm > 0
      ? distanceRatio(distanceKm, radiusKm)
      : null;

  return (
    <article data-provider-id={provider.id} role="listitem">
      <div
        ref={shellRef}
        className={`provider-card-shell relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 ${
          isHovered && !previewOpen ? "provider-card-shell--hovered" : ""
        }`}
        onMouseEnter={() => {
          onHover();
          scheduleOpen();
        }}
        onMouseLeave={() => {
          onLeave();
          scheduleClose();
        }}
        onKeyDown={(e) => {
          if (e.altKey && e.key === "Enter") {
            e.preventDefault();
            onPreviewOpen();
          }
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
          const { longPress } = previewDelays();
          window.clearTimeout(pressTimer.current);
          pressTimer.current = window.setTimeout(() => {
            suppressClick.current = true;
            onPreviewOpen();
          }, longPress);
        }}
        onTouchMove={(e) => {
          const start = touchStart.current;
          if (!start) return;
          const t = e.touches[0];
          if (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10) {
            window.clearTimeout(pressTimer.current);
          }
        }}
        onTouchEnd={() => {
          window.clearTimeout(pressTimer.current);
          touchStart.current = null;
        }}
        onContextMenu={(e) => {
          if (suppressClick.current) e.preventDefault();
        }}
      >
        <Link
          href={`/fruteria/${provider.id}`}
          className="block cursor-pointer p-3 pb-0"
          onClick={(e) => {
            if (suppressClick.current) {
              e.preventDefault();
              suppressClick.current = false;
            }
          }}
        >
          <div className="group relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
            {imageSrc && !imgError ? (
              <Image
                src={imageSrc}
                alt={provider.businessName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <ImagePlaceholder variant="cover" className="absolute inset-0 h-full w-full" />
            )}

            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {provider.isVerified && (
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow">
                  ✓ Verificado
                </span>
              )}
              {provider.rating >= 4.8 && (
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow">
                  ⭐ Favorito
                </span>
              )}
            </div>

            <button
              className="absolute right-3 top-3 p-2 transition-transform hover:scale-110"
              onClick={(e) => e.preventDefault()}
              aria-label="Agregar a favoritos"
            >
              <Heart size={22} className="text-white drop-shadow-lg" />
            </button>
          </div>

          <div className="space-y-1 pb-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-semibold leading-tight">{provider.businessName}</h3>
              <div className="flex shrink-0 items-center gap-0.5 text-sm">
                {provider.reviewCount === 0 ? (
                  <span className="text-xs text-gray-400">Sin reseñas todavía</span>
                ) : (
                  <>
                    <Star size={14} fill="currentColor" />
                    <span>{provider.rating.toFixed(1)}</span>
                    <span className="text-gray-400">({provider.reviewCount})</span>
                  </>
                )}
              </div>
            </div>

            {showDistance ? (
              <div className="space-y-1 pt-0.5">
                <p className="text-sm font-semibold text-slate-900">
                  {formatSearchDistance(distanceKm)}
                </p>
                <p className="text-sm text-slate-600">{formatCardEta(distanceKm)}</p>
                {ratio != null && (
                  <div
                    className="h-1 overflow-hidden rounded-full bg-slate-200"
                    role="presentation"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-150 motion-reduce:transition-none"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : !hasPin ? (
              <p className="text-sm text-slate-500">Elige una ubicación para ver la distancia.</p>
            ) : null}

            <p className="line-clamp-1 text-sm text-gray-500">
              {provider.description ?? "Frutería local"}
            </p>

            <p className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={13} />
              {provider.address}, {provider.city}
            </p>

            <p className="text-sm text-gray-500">{provider.productCount} productos disponibles</p>
          </div>
        </Link>

        <div className="relative z-20 flex flex-wrap items-center gap-3 px-3 pb-3">
          <button
            type="button"
            onClick={() => onPreviewOpen()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 opacity-0 hover:bg-slate-100 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            aria-label="Vista previa"
          >
            <Eye size={18} aria-hidden />
          </button>
          <ContactCTA providerId={provider.id} phone={provider.phone} variant="link" />
        </div>

        {previewOpen && (
          <ProviderPreviewInCard
            providerId={provider.id}
            onClose={() => {
              clearTimers();
              onPreviewClose();
            }}
            onNotFound={onPreviewNotFound}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        )}
      </div>
    </article>
  );
}
