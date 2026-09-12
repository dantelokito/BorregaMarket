import type { CatalogItem, ProviderProduct, ProviderSection } from "@/lib/api/types";

export interface CatalogSectionGroup {
  section: ProviderSection | null;
  items: CatalogItem[];
}

export function groupCatalogBySection(
  catalog: CatalogItem[],
  sections: ProviderSection[]
): CatalogSectionGroup[] {
  const byId = new Map<string, CatalogItem[]>();
  const unsectioned: CatalogItem[] = [];

  for (const item of catalog) {
    if (item.sectionId) {
      const list = byId.get(item.sectionId) ?? [];
      list.push(item);
      byId.set(item.sectionId, list);
    } else {
      unsectioned.push(item);
    }
  }

  const ordered: CatalogSectionGroup[] = [...sections]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
    .map((section) => ({
      section,
      items: byId.get(section.id) ?? [],
    }));

  if (unsectioned.length > 0) {
    ordered.push({ section: null, items: unsectioned });
  }

  return ordered;
}

export interface PublicSectionGroup {
  sectionId: string | null;
  heading: string;
  sortOrder: number;
  items: ProviderProduct[];
}

export function groupPublicProductsBySection(products: ProviderProduct[]): PublicSectionGroup[] {
  const visible = products.filter((p) => p.isAvailable);
  const buckets = new Map<string, PublicSectionGroup>();

  for (const product of visible) {
    const key = product.sectionId ?? "__none__";
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(product);
      continue;
    }
    const sortOrder =
      product.sectionId == null ? Number.MAX_SAFE_INTEGER : (product.sectionSortOrder ?? 0);
    buckets.set(key, {
      sectionId: product.sectionId ?? null,
      heading: product.sectionName?.trim() || "Sin sección",
      sortOrder,
      items: [product],
    });
  }

  return [...buckets.values()]
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.heading.localeCompare(b.heading, "es"));
}
