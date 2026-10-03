import prisma from "@/lib/prisma";
import { invalidateProviderCache, isPublicCacheEnabled } from "@/lib/cache/public-cache";

/** Cambios de un Product del catálogo afectan a cada proveedor que lo ofrece. Nunca lanza. */
export async function invalidateProductProviders(productId: string): Promise<void> {
  if (!isPublicCacheEnabled()) return;
  try {
    const rows = await prisma.providerProduct.findMany({
      where: { productId },
      select: { providerId: true },
      distinct: ["providerId"],
    });
    await invalidateProviderCache(rows.map((r) => r.providerId));
  } catch (err) {
    console.warn("[cache] invalidate_failed", err instanceof Error ? err.message : err);
  }
}
