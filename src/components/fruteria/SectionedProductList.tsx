"use client";

import type { ProviderProduct } from "@/lib/api/types";
import { groupPublicProductsBySection } from "@/lib/catalog/group-by-section";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactCTA } from "@/components/fruteria/ContactCTA";
import { PickupNotice } from "@/components/cart/PickupNotice";
import { ProductTable } from "@/components/fruteria/ProductTable";

export function SectionedProductList({
  products,
  phone,
  providerId,
  quantities = {},
  onQuantityChange,
}: {
  products: ProviderProduct[];
  phone?: string;
  providerId?: string;
  quantities?: Record<string, number>;
  onQuantityChange?: (product: ProviderProduct, quantity: number) => void;
}) {
  const groups = groupPublicProductsBySection(products);
  const visibleCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  if (visibleCount === 0) {
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
      {groups.map((group) => (
        <div key={group.sectionId ?? "sin-seccion"} className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">{group.heading}</h3>
          <ProductTable
            products={group.items}
            quantities={quantities}
            onQuantityChange={onQuantityChange}
            embedded
          />
        </div>
      ))}
    </div>
  );
}
