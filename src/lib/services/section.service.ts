import { AuditAction, SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { assertRateLimit } from "@/lib/rate-limit/token-bucket";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import {
  CatalogConflictError,
  CatalogForbiddenError,
  CatalogNotFoundError,
} from "@/lib/services/local-product.service";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export async function listProviderSections(userId: string, providerId?: string) {
  const provider = await findOwnedProvider(userId, providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  const sections = await prisma.providerSection.findMany({
    where: { providerId: provider.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { providerProducts: true } } },
  });

  return sections.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
    productCount: s._count.providerProducts,
  }));
}

export async function createProviderSection(params: {
  userId: string;
  providerId?: string;
  name: string;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  assertRateLimit(`section-create:${provider.id}`, 30, 60 * 60 * 1000);

  const nameNormalized = normalizeName(params.name);
  const max = await prisma.providerSection.aggregate({
    where: { providerId: provider.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  try {
    const created = await prisma.providerSection.create({
      data: {
        providerId: provider.id,
        name: params.name.trim(),
        nameNormalized,
        sortOrder,
      },
    });
    await writeAuditLog({
      module: SystemModule.PRODUCTS,
      action: AuditAction.CREATE,
      entityId: created.id,
      userId: params.userId,
      ipAddress: params.ipAddress,
      details: { name: created.name },
    });
    return { id: created.id, name: created.name, sortOrder: created.sortOrder, productCount: 0 };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new CatalogConflictError("Ya existe una sección con ese nombre");
    }
    throw err;
  }
}

export async function updateProviderSection(params: {
  userId: string;
  providerId?: string;
  sectionId: string;
  name?: string;
  sortOrder?: number;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  const section = await prisma.providerSection.findUnique({ where: { id: params.sectionId } });
  if (!section) throw new CatalogNotFoundError("Sección no encontrada");
  if (section.providerId !== provider.id) throw new CatalogForbiddenError();

  try {
    const updated = await prisma.providerSection.update({
      where: { id: section.id },
      data: {
        ...(params.name !== undefined
          ? { name: params.name.trim(), nameNormalized: normalizeName(params.name) }
          : {}),
        ...(params.sortOrder !== undefined ? { sortOrder: params.sortOrder } : {}),
      },
      include: { _count: { select: { providerProducts: true } } },
    });
    await writeAuditLog({
      module: SystemModule.PRODUCTS,
      action: AuditAction.UPDATE,
      entityId: updated.id,
      userId: params.userId,
      ipAddress: params.ipAddress,
      details: { name: updated.name, sortOrder: updated.sortOrder },
    });
    return {
      id: updated.id,
      name: updated.name,
      sortOrder: updated.sortOrder,
      productCount: updated._count.providerProducts,
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new CatalogConflictError("Ya existe una sección con ese nombre");
    }
    throw err;
  }
}

export async function reorderProviderSections(params: {
  userId: string;
  providerId?: string;
  ids: string[];
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  const existing = await prisma.providerSection.findMany({
    where: { providerId: provider.id },
    select: { id: true },
  });
  const existingIds = existing.map((s) => s.id).sort();
  const incoming = [...params.ids].sort();
  if (existingIds.length !== incoming.length || existingIds.some((id, i) => id !== incoming[i])) {
    const unknown = params.ids.filter((id) => !existing.some((s) => s.id === id));
    if (unknown.length > 0) {
      throw new CatalogForbiddenError();
    }
    throw new CatalogConflictError("La permutación debe incluir todas las secciones");
  }

  await prisma.$transaction(
    params.ids.map((id, index) =>
      prisma.providerSection.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.UPDATE,
    entityId: provider.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { ids: params.ids },
  });

  return listProviderSections(params.userId, params.providerId ?? provider.id);
}

export async function deleteProviderSection(params: {
  userId: string;
  providerId?: string;
  sectionId: string;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  const section = await prisma.providerSection.findUnique({
    where: { id: params.sectionId },
    include: { _count: { select: { providerProducts: true } } },
  });
  if (!section) throw new CatalogNotFoundError("Sección no encontrada");
  if (section.providerId !== provider.id) throw new CatalogForbiddenError();
  if (section._count.providerProducts > 0) {
    throw new CatalogConflictError("La sección tiene productos. Muévelos antes de eliminarla");
  }

  await prisma.providerSection.delete({ where: { id: section.id } });
  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.DELETE,
    entityId: section.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { name: section.name },
  });

  return { id: section.id, deleted: true };
}
