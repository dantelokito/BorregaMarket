import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { findOwnedProvider, listOwnedProviders } from "@/lib/providers/owned-provider";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { GlobalReportsNotAvailableError } from "@/lib/services/dashboard.service";
import { buildMeta } from "@/lib/services/pagination";
import { formatOnHand } from "@/lib/inventory/convert-qty";
import { effectiveSaleUnit } from "@/lib/catalog/sellable";
import { sumReservedByProductIds } from "@/lib/services/inventory.service";
import { DASHBOARD_TZ, addCalendarDays, monterreyDayStartUtc } from "@/lib/timezone";

export async function getBranchInventoryReport(params: {
  userId: string;
  providerId: string;
  page: number;
  limit: number;
  skip: number;
  from?: string;
  to?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  const offers = await prisma.providerProduct.findMany({
    where: { providerId: provider.id, archivedAt: null },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
  const reserved = await sumReservedByProductIds(
    provider.id,
    offers.map((row) => row.id)
  );

  if (offers.length === 0) {
    return {
      data: {
        timezone: DASHBOARD_TZ,
        generatedAt: new Date().toISOString(),
        scope: "activeProvider" as const,
        providerId: provider.id,
        balances: [],
        entries: [],
      },
      meta: { ...buildMeta(params.page, params.limit, 0), balancesCount: 0 },
    };
  }

  const entryWhere: Prisma.InventoryEntryWhereInput = {
    providerProductId: { in: offers.map((row) => row.id) },
  };
  if (params.from && params.to) {
    entryWhere.createdAt = {
      gte: monterreyDayStartUtc(params.from),
      lt: monterreyDayStartUtc(addCalendarDays(params.to, 1)),
    };
  }

  const [total, entries] = await Promise.all([
    prisma.inventoryEntry.count({ where: entryWhere }),
    prisma.inventoryEntry.findMany({
      where: entryWhere,
      include: { providerProduct: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  const nameByPp = new Map(offers.map((row) => [row.id, row.product.name]));

  return {
    data: {
      timezone: DASHBOARD_TZ,
      generatedAt: new Date().toISOString(),
      scope: "activeProvider" as const,
      providerId: provider.id,
      balances: offers.map((row) => ({
        providerProductId: row.id,
        productId: row.productId,
        name: row.product.name,
        effectiveSaleUnit: effectiveSaleUnit(row.saleUnit, row.product.unit),
        onHand: formatOnHand(row.onHand),
        reserved: formatOnHand(reserved.get(row.id) ?? new Prisma.Decimal(0)),
        isAvailable: row.isAvailable,
      })),
      entries: entries.map((entry) => ({
        id: entry.id,
        providerProductId: entry.providerProductId,
        name: entry.providerProduct.product.name ?? nameByPp.get(entry.providerProductId),
        quantity: formatOnHand(entry.quantity),
        receiveAs: entry.receiveAs,
        appliedDelta: formatOnHand(entry.appliedDelta),
        createdAt: entry.createdAt.toISOString(),
      })),
    },
    meta: {
      ...buildMeta(params.page, params.limit, total),
      balancesCount: offers.length,
    },
  };
}

export async function getGlobalInventoryReport(params: { userId: string }) {
  const owned = await listOwnedProviders(params.userId);
  if (owned.length <= 1) {
    throw new GlobalReportsNotAvailableError();
  }

  const offers = await prisma.providerProduct.findMany({
    where: {
      archivedAt: null,
      providerId: { in: owned.map((p) => p.id) },
    },
    include: {
      product: true,
      provider: { select: { id: true, businessName: true, address: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byProvider = new Map<
    string,
    {
      providerId: string;
      businessName: string;
      branchLabel: string;
      balances: Array<{
        providerProductId: string;
        name: string;
        effectiveSaleUnit: string;
        onHand: string;
      }>;
    }
  >();
  for (const row of owned) {
    byProvider.set(row.id, {
      providerId: row.id,
      businessName: row.businessName,
      branchLabel: row.address,
      balances: [],
    });
  }
  for (const row of offers) {
    const bucket = byProvider.get(row.providerId);
    if (!bucket) continue;
    bucket.balances.push({
      providerProductId: row.id,
      name: row.product.name,
      effectiveSaleUnit: effectiveSaleUnit(row.saleUnit, row.product.unit),
      onHand: formatOnHand(row.onHand),
    });
  }

  return {
    timezone: DASHBOARD_TZ,
    generatedAt: new Date().toISOString(),
    scope: "allOwnedProviders" as const,
    providerCount: owned.length,
    byProvider: [...byProvider.values()],
  };
}
