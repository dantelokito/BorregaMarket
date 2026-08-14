"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getProviderById } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import type { ProviderDetail, ProviderProduct } from "@/lib/api/types";
import { ProviderHero } from "@/components/fruteria/ProviderHero";
import { ProductTable } from "@/components/fruteria/ProductTable";
import { MiniMap } from "@/components/fruteria/MiniMap";
import { ContactCTA } from "@/components/fruteria/ContactCTA";
import { ReviewList } from "@/components/reviews/ReviewList";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MapPin, Phone } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import {
  cartItemCount,
  cartTotal,
  setItemQuantity,
  upsertItem,
  type SessionCart,
} from "@/lib/cart/session-cart";
import { formatCurrency } from "@/lib/format";

export function FruteriaDetailClient() {
  const params = useParams();
  const id = params.id as string;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [pendingProduct, setPendingProduct] = useState<{
    product: ProviderProduct;
    quantity: number;
  } | null>(null);

  const { cart, save } = useCart();

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const { data } = await getProviderById(id);
      setProvider(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar la frutería");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    if (cart?.providerId === id) {
      for (const item of cart.items) {
        map[item.providerProductId] = item.quantity;
      }
    }
    return map;
  }, [cart, id]);

  const thisCart = cart?.providerId === id ? cart : null;
  const itemCount = cartItemCount(thisCart);
  const total = cartTotal(thisCart);
  const hasItems = itemCount > 0;

  function applyQuantity(product: ProviderProduct, quantity: number) {
    if (!provider) return;
    const base: SessionCart =
      cart?.providerId === provider.id
        ? cart
        : {
            providerId: provider.id,
            providerName: provider.businessName,
            providerAddress: `${provider.address}, ${provider.city}`,
            items: [],
          };

    const nextItem = {
      providerProductId: product.providerProductId,
      name: product.name,
      unitPrice: product.price,
      unitOfMeasure: product.unitOfMeasure,
      quantity,
      imageUrl: product.imageUrl,
    };

    const next =
      quantity <= 0
        ? setItemQuantity(base, product.providerProductId, 0)
        : upsertItem(base, nextItem);
    save(next.items.length === 0 ? null : next);
  }

  function handleQuantityChange(product: ProviderProduct, quantity: number) {
    if (cart && cart.providerId !== id && cart.items.length > 0) {
      setPendingProduct({ product, quantity });
      return;
    }
    applyQuantity(product, quantity);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mb-8 h-4 w-48 animate-pulse rounded bg-gray-200" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <EmptyState
          title="Frutería no encontrada"
          description="Es posible que este negocio ya no esté disponible."
          action={
            <Link href="/explorar" className="font-medium text-[var(--brand)] hover:underline">
              ← Explorar más fruterías
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ErrorBanner message={error || "Error desconocido"} onRetry={fetchProvider} />
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-5xl px-6 py-8 ${hasItems ? "pb-36" : "pb-28"} lg:pb-8`}>
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/explorar" className="hover:text-[var(--brand)]">
          Explorar
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{provider.businessName}</span>
      </nav>

      <ProviderHero provider={provider} />

      {hasItems && (
        <div className="mb-6 hidden lg:flex lg:flex-wrap lg:gap-2">
          <Link
            href="/carrito"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 py-3 font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            <ShoppingCart size={18} aria-hidden />
            Encargar
          </Link>
          <ContactCTA
            providerId={provider.id}
            phone={provider.phone}
            emphasis="secondary"
          />
        </div>
      )}

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-gray-600">
            <MapPin size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {provider.address}, {provider.city}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={18} aria-hidden />
            <span>{provider.phone}</span>
          </div>
          <div className="hidden lg:block">
            {!hasItems && <ContactCTA providerId={provider.id} phone={provider.phone} />}
          </div>
        </div>
        <MiniMap
          latitude={provider.latitude}
          longitude={provider.longitude}
          businessName={provider.businessName}
        />
      </div>

      <section>
        <ProductTable
          products={provider.products}
          phone={provider.phone}
          providerId={provider.id}
          quantities={quantities}
          onQuantityChange={handleQuantityChange}
        />
      </section>

      <ReviewList
        providerId={provider.id}
        googleEnabled={provider.googleReviews?.enabled}
        googleMapsUrl={provider.googleReviews?.mapsUrl}
      />

      {hasItems && (
        <div className="mt-4 hidden rounded-xl border border-gray-200 bg-white px-4 py-3 lg:flex lg:items-center lg:justify-between">
          <p className="text-sm font-medium" aria-live="polite">
            {itemCount} {itemCount === 1 ? "producto" : "productos"} · {formatCurrency(total)}
          </p>
          <Link href="/carrito" className="font-semibold text-[var(--brand)] hover:underline">
            Ver carrito →
          </Link>
        </div>
      )}

      <div className="mt-8 hidden lg:block">
        <Link href="/explorar" className="text-sm font-medium text-[var(--brand)] hover:underline">
          ← Explorar más fruterías
        </Link>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white p-4 lg:hidden">
        {hasItems && (
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium" aria-live="polite">
              {itemCount} {itemCount === 1 ? "producto" : "productos"} · {formatCurrency(total)}
            </p>
            <Link
              href="/carrito"
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
            >
              Encargar
            </Link>
          </div>
        )}
        <ContactCTA
          providerId={provider.id}
          phone={provider.phone}
          emphasis={hasItems ? "secondary" : "primary"}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingProduct)}
        title={cart ? `Ya tienes un carrito de ${cart.providerName}` : "Carrito de otra frutería"}
        description="Un encargo solo puede ser de una frutería. ¿Vaciar y empezar aquí?"
        confirmLabel="Vaciar y empezar aquí"
        cancelLabel="Conservar carrito"
        destructive
        onCancel={() => setPendingProduct(null)}
        onConfirm={() => {
          if (!pendingProduct || !provider) return;
          save(null);
          const { product, quantity } = pendingProduct;
          setPendingProduct(null);
          applyQuantity(product, quantity);
        }}
      />
    </div>
  );
}
