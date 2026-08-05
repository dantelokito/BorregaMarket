"use client";

import Image from "next/image";
import { Heart, Star, Phone, MapPin } from "lucide-react";
import type { ProviderListing } from "@/types";

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

  return (
    <article
      className={`cursor-pointer transition-transform ${isHovered ? "scale-[1.01]" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Image carousel area */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 group">
        <Image
          src={provider.coverUrl ?? provider.logoUrl ?? "/placeholder.jpg"}
          alt={provider.businessName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {provider.isVerified && (
            <span className="bg-white/95 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              ✓ Verificado
            </span>
          )}
          {provider.rating >= 4.8 && (
            <span className="bg-white/95 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              ⭐ Favorito
            </span>
          )}
        </div>

        {/* Favorite */}
        <button
          className="absolute top-3 right-3 p-2 hover:scale-110 transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          <Heart size={22} className="text-white drop-shadow-lg" />
        </button>

        {/* Carousel dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/50"}`}
            />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] leading-tight">{provider.businessName}</h3>
          <div className="flex items-center gap-0.5 shrink-0 text-sm">
            <Star size={14} fill="currentColor" />
            <span>{provider.rating.toFixed(2)}</span>
            <span className="text-gray-400">({provider.reviewCount})</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm line-clamp-1">
          {provider.description ?? "Frutería local"}
        </p>

        <p className="text-gray-500 text-sm flex items-center gap-1">
          <MapPin size={13} />
          {provider.address}, {provider.city}
        </p>

        <p className="text-gray-500 text-sm">
          {provider.productCount} productos disponibles
        </p>

        <p className="pt-1">
          <span className="font-semibold text-[15px]">{priceLabel}</span>
        </p>

        {/* Contact button */}
        <a
          href={`tel:${provider.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--brand)] font-medium hover:underline"
        >
          <Phone size={14} />
          Contactar
        </a>
      </div>
    </article>
  );
}
