"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/format";
import { toUnitOfMeasure } from "@/lib/orders/labels";
import type { CatalogItem } from "@/lib/api/types";

export function PosProductCard({
  item,
  showImage,
  onSelect,
}: {
  item: CatalogItem;
  showImage: boolean;
  onSelect: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const src = item.imageUrl ?? item.product.imageUrl ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left hover:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      {showImage ? (
        <div className="relative aspect-video w-full bg-gradient-to-br from-orange-50 to-amber-100">
          {!src || imgError ? (
            <div
              className="flex h-full min-h-[80px] w-full items-center justify-center text-2xl"
              role="img"
              aria-label={`Sin foto de ${item.product.name}`}
            >
              <span aria-hidden>🍊</span>
            </div>
          ) : (
            <Image
              src={src}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 20vw"
              loading="lazy"
              unoptimized={src.startsWith("/api/media")}
              onError={() => setImgError(true)}
            />
          )}
        </div>
      ) : null}
      <div className="p-4">
        <p className="font-medium">{item.product.name}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          {formatCurrency(item.price ?? 0)} · {toUnitOfMeasure(item.product.unit)}
        </p>
      </div>
    </button>
  );
}
