"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function CatalogRowThumb({
  src,
  name,
  category,
}: {
  src: string | null | undefined;
  name: string;
  category?: string | null;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <ImagePlaceholder
        variant="product"
        category={category ?? undefined}
        label={`Sin foto de ${name}`}
        className="h-12 w-12 shrink-0"
      />
    );
  }

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        sizes="48px"
        loading="lazy"
        unoptimized={src.startsWith("/api/media")}
        onError={() => setError(true)}
      />
    </div>
  );
}
