"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProviderProduct, UnitOfMeasure } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactCTA } from "@/components/fruteria/ContactCTA";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { PickupNotice } from "@/components/cart/PickupNotice";
import { formatCurrency } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/orders/labels";

interface ProductTableProps {
  products: ProviderProduct[];
  phone?: string;
  providerId?: string;
  quantities?: Record<string, number>;
  onQuantityChange?: (product: ProviderProduct, quantity: number) => void;
}

const categoryLabels: Record<string, string> = {
  FRUTA: "Frutas",
  VERDURA: "Verduras",
  AGRICOLA: "Agrícola",
};

function ProductThumb({ product }: { product: ProviderProduct }) {
  const [error, setError] = useState(false);
  const src = product.imageUrl;

  if (!src || error) {
    return <ImagePlaceholder variant="product" category={product.category} />;
  }

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
      <Image
        src={src}
        alt={product.name}
        fill
        className="object-cover"
        sizes="48px"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}

function unitLabel(product: ProviderProduct): string {
  return UNIT_LABEL[product.unitOfMeasure] ?? product.unit;
}

export function ProductTable({
  products,
  phone,
  providerId,
  quantities = {},
  onQuantityChange,
}: ProductTableProps) {
  const visible = products.filter((p) => p.isAvailable);

  if (visible.length === 0) {
    return (
      <EmptyState
        title="Sin productos publicados aún"
        description="Esta frutería aún no ha publicado productos. Puedes contactarla directamente."
        icon="📦"
        action={
          phone && providerId ? (
            <ContactCTA providerId={providerId} phone={phone} />
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Productos disponibles</h2>
        <PickupNotice />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="hidden w-full text-sm sm:table">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Producto</th>
              <th className="px-4 py-3 text-right font-semibold">Precio</th>
              <th className="px-4 py-3 text-left font-semibold">Unidad</th>
              <th className="px-4 py-3 text-left font-semibold">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((product) => (
              <ProductRow
                key={product.providerProductId}
                product={product}
                quantity={quantities[product.providerProductId] ?? 0}
                onQuantityChange={onQuantityChange}
                layout="table"
              />
            ))}
          </tbody>
        </table>
        <ul className="divide-y divide-gray-100 sm:hidden">
          {visible.map((product) => (
            <li key={product.providerProductId} className="p-4">
              <ProductRow
                product={product}
                quantity={quantities[product.providerProductId] ?? 0}
                onQuantityChange={onQuantityChange}
                layout="card"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  quantity,
  onQuantityChange,
  layout,
}: {
  product: ProviderProduct;
  quantity: number;
  onQuantityChange?: (product: ProviderProduct, quantity: number) => void;
  layout: "table" | "card";
}) {
  const uom = product.unitOfMeasure as UnitOfMeasure;

  const stepper = onQuantityChange ? (
    <QuantityStepper
      value={quantity}
      onChange={(n) => onQuantityChange(product, n)}
      productName={product.name}
      unitOfMeasure={uom}
    />
  ) : null;

  if (layout === "card") {
    return (
      <div>
        <div className="flex items-center gap-3">
          <ProductThumb product={product} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-gray-500">
              {categoryLabels[product.category] ?? product.category}
            </p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatCurrency(product.price)} / {unitLabel(product)}
            </p>
          </div>
        </div>
        <div className="mt-3">{stepper}</div>
      </div>
    );
  }

  return (
    <tr className="bg-white">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb product={product} />
          <div>
            <span className="font-medium">{product.name}</span>
            <p className="text-xs text-gray-500">
              {categoryLabels[product.category] ?? product.category}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">
        {formatCurrency(product.price)}
      </td>
      <td className="px-4 py-3 text-gray-500">/ {unitLabel(product)}</td>
      <td className="px-4 py-3">{stepper}</td>
    </tr>
  );
}
