"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MapPin } from "lucide-react";
import type { ProviderListing } from "@/types";
import { ContactCTA } from "@/components/fruteria/ContactCTA";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

interface ProviderCardProps {
  provider: ProviderListing;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function ProviderCard({ provider, isHovered, onHover, onLeave }: ProviderCardProps) {
  const priceLabel = provider.minPrice
    ? `$${provider.minPrice.toLocaleString("es-MX")} MXN desde`
    : "Consultar precios";

  const imageSrc = provider.coverUrl ?? provider.logoUrl;
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className={`transition-transform ${isHovered ? "scale-[1.01]" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      role="listitem"
    >
      <Link href={`/fruteria/${provider.id}`} className="block cursor-pointer">
        <div className="group relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
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

        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold leading-tight">{provider.businessName}</h3>
            <div className="flex shrink-0 items-center gap-0.5 text-sm">
              <Star size={14} fill="currentColor" />
              <span>{provider.rating.toFixed(2)}</span>
              <span className="text-gray-400">({provider.reviewCount})</span>
            </div>
          </div>

          <p className="line-clamp-1 text-sm text-gray-500">
            {provider.description ?? "Frutería local"}
          </p>

          <p className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={13} />
            {provider.address}, {provider.city}
          </p>

          <p className="text-sm text-gray-500">{provider.productCount} productos disponibles</p>

          <p className="pt-1">
            <span className="text-[15px] font-semibold">{priceLabel}</span>
          </p>
        </div>
      </Link>

      <ContactCTA providerId={provider.id} phone={provider.phone} variant="link" />
    </article>
  );
}
