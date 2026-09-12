import { describe, expect, it } from "vitest";
import { groupCatalogBySection, groupPublicProductsBySection } from "@/lib/catalog/group-by-section";
import type { CatalogItem, ProviderProduct, ProviderSection } from "@/lib/api/types";

const sections: ProviderSection[] = [
  { id: "s2", name: "Verduras", sortOrder: 1, productCount: 1 },
  { id: "s1", name: "Frutas de temporada", sortOrder: 0, productCount: 1 },
];

function item(partial: Partial<CatalogItem> & { id: string; name: string }): CatalogItem {
  return {
    product: {
      id: partial.id,
      name: partial.name,
      slug: partial.name,
      category: null,
      unit: "KG",
      description: null,
    },
    price: 10,
    isAvailable: true,
    providerProductId: `pp-${partial.id}`,
    scope: "LOCAL",
    sectionId: partial.sectionId ?? null,
    sectionName: partial.sectionName ?? null,
    imageUrl: null,
  };
}

describe("groupCatalogBySection", () => {
  it("orders by sortOrder and appends Sin sección", () => {
    const catalog = [
      item({ id: "a", name: "Chile", sectionId: "s2", sectionName: "Verduras" }),
      item({ id: "b", name: "Mango", sectionId: "s1", sectionName: "Frutas de temporada" }),
      item({ id: "c", name: "Aguacate" }),
    ];
    const groups = groupCatalogBySection(catalog, sections);
    expect(groups.map((g) => g.section?.name ?? "Sin sección")).toEqual([
      "Frutas de temporada",
      "Verduras",
      "Sin sección",
    ]);
    expect(groups[0].items[0].product.name).toBe("Mango");
    expect(groups[2].items).toHaveLength(1);
  });
});

describe("groupPublicProductsBySection", () => {
  it("omits empty headings and unavailable products", () => {
    const products: ProviderProduct[] = [
      {
        providerProductId: "1",
        productId: "p1",
        name: "Mango",
        slug: "mango",
        category: "FRUTA",
        unit: "KG",
        unitOfMeasure: "KG",
        price: 40,
        isAvailable: true,
        sectionId: "s1",
        sectionName: "Frutas de temporada",
        sectionSortOrder: 0,
      },
      {
        providerProductId: "2",
        productId: "p2",
        name: "Oculto",
        slug: "oculto",
        category: null,
        unit: "KG",
        unitOfMeasure: "KG",
        price: 10,
        isAvailable: false,
        sectionId: "s2",
        sectionName: "Vacía",
        sectionSortOrder: 1,
      },
    ];
    const groups = groupPublicProductsBySection(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].heading).toBe("Frutas de temporada");
  });
});
