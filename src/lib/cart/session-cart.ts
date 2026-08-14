import type { UnitOfMeasure } from "@/lib/api/types";
import { lineAmount } from "@/lib/format";

export const CART_STORAGE_KEY = "lbm-cart-f3";
export const CART_EVENT = "lbm-cart-change";

export interface CartItem {
  providerProductId: string;
  name: string;
  unitPrice: number;
  unitOfMeasure: UnitOfMeasure;
  quantity: number;
  imageUrl?: string | null;
}

export interface SessionCart {
  providerId: string;
  providerName: string;
  providerAddress?: string;
  items: CartItem[];
}

export function cartItemCount(cart: SessionCart | null): number {
  if (!cart) return 0;
  return cart.items.filter((i) => i.quantity > 0).length;
}

export function cartTotal(cart: SessionCart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + lineAmount(item.quantity, item.unitPrice), 0);
}

export function readCart(): SessionCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCart;
    if (!parsed?.providerId || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCart(cart: SessionCart | null): void {
  if (typeof window === "undefined") return;
  if (!cart || cart.items.length === 0) {
    sessionStorage.removeItem(CART_STORAGE_KEY);
  } else {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

export function clearCart(): void {
  writeCart(null);
}

export function setItemQuantity(
  cart: SessionCart,
  providerProductId: string,
  quantity: number
): SessionCart {
  const items =
    quantity <= 0
      ? cart.items.filter((i) => i.providerProductId !== providerProductId)
      : cart.items.map((i) =>
          i.providerProductId === providerProductId ? { ...i, quantity } : i
        );
  return { ...cart, items };
}

export function upsertItem(cart: SessionCart, item: CartItem): SessionCart {
  const exists = cart.items.some((i) => i.providerProductId === item.providerProductId);
  if (!exists) {
    return { ...cart, items: [...cart.items, item] };
  }
  return setItemQuantity(cart, item.providerProductId, item.quantity);
}
