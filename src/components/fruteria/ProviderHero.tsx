"use client";

import { useState } from "react";
import Image from "next/image";
import { Shield, Star } from "lucide-react";
import type { ProviderDetail } from "@/lib/api/types";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

interface ProviderHeroProps {
  provider: ProviderDetail;
}

export function ProviderHero({ provider }: ProviderHeroProps) {
  const [coverError, setCoverError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="mb-8">
      <div className="relative mb-4 aspect-[2/1] w-full overflow-hidden rounded-xl bg-gray-100 sm:aspect-[16/6]">
        {provider.coverUrl && !coverError ? (
          <Image
            src={provider.coverUrl}
            alt={`Portada de ${provider.businessName}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            onError={() => setCoverError(true)}
          />
        ) : (
          <ImagePlaceholder variant="cover" className="absolute inset-0" label="Sin portada" />
        )}

        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
          {provider.logoUrl && !logoError ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow sm:h-20 sm:w-20">
              <Image
                src={provider.logoUrl}
                alt={`Logo de ${provider.businessName}`}
                fill
                className="object-cover"
                sizes="80px"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <ImagePlaceholder
              variant="logo"
              className="border-2 border-white shadow"
              label="Sin logo"
            />
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold lg:text-3xl">{provider.businessName}</h1>
        {provider.isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <Shield size={14} aria-hidden />
            Verificado
          </span>
        )}
      </div>
      <p className="text-gray-500">
        {provider.address}, {provider.city}
        {provider.state ? `, ${provider.state}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-1 text-sm">
        <Star size={16} fill="currentColor" className="text-yellow-500" aria-hidden />
        <span className="font-medium">{provider.rating.toFixed(1)}</span>
        <span className="text-gray-400">({provider.reviewCount} reseñas)</span>
      </div>
      {provider.description && (
        <p className="mt-4 text-gray-600">{provider.description}</p>
      )}
    </div>
  );
}
