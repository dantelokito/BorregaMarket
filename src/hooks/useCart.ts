"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CART_EVENT,
  type SessionCart,
  readCart,
  writeCart,
} from "@/lib/cart/session-cart";

export function useCart() {
  const [cart, setCart] = useState<SessionCart | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setCart(readCart());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    window.addEventListener(CART_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const save = useCallback((next: SessionCart | null) => {
    writeCart(next);
    setCart(readCart());
  }, []);

  return { cart, hydrated, save, refresh };
}
