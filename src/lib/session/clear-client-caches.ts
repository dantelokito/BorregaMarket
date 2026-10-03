import { CART_STORAGE_KEY } from "@/lib/cart/session-cart";
import { clearProviderPreviewCache } from "@/lib/maps/preview-cache";

/** Tras logout: caché de imágenes del SW, carrito de sesión y previews en memoria. */
export async function clearClientCaches(): Promise<void> {
  try {
    sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* modo privado */
  }
  clearProviderPreviewCache();
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("lbm-media")).map((key) => caches.delete(key))
    );
  } catch {
    /* el SW puede no existir en dev */
  }
}
