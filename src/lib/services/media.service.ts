import { AuditAction, ProductScope, SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { assertRateLimit } from "@/lib/rate-limit/token-bucket";
import {
  MAX_IMAGE_BYTES,
  detectImageMime,
  writeImageBuffer,
  unlinkMediaUrl,
  DiskStorageError,
  type StoredImageMime,
} from "@/lib/storage/local-disk";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export class MediaValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export class MediaNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaNotFoundError";
  }
}

export class MediaForbiddenError extends Error {
  constructor(message = "Acceso denegado") {
    super(message);
    this.name = "MediaForbiddenError";
  }
}

export { DiskStorageError };

async function fileToBuffer(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab);
}

async function validateAndStore(file: File): Promise<{
  url: string;
  bytes: number;
  mime: StoredImageMime;
}> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new MediaValidationError("file", "El archivo supera el límite de 20MB");
  }
  const buffer = await fileToBuffer(file);
  const mime = detectImageMime(buffer);
  if (!mime) {
    throw new MediaValidationError(
      "file",
      "Formato no permitido. Usa JPEG, PNG o WebP"
    );
  }
  const stored = await writeImageBuffer({ buffer, mime });
  return { url: stored.url, bytes: stored.bytes, mime };
}

export async function uploadProviderMedia(params: {
  userId: string;
  field: "logo" | "cover";
  file: File;
  ipAddress?: string;
}): Promise<{ url: string; field: "logoUrl" | "coverUrl" }> {
  const provider = await prisma.provider.findUnique({
    where: { userId: params.userId },
  });
  if (!provider) {
    throw new MediaNotFoundError("Perfil de proveedor no encontrado");
  }

  assertRateLimit(`media:${provider.id}`, 20, 10 * 60 * 1000);

  const column = params.field === "logo" ? "logoUrl" : "coverUrl";
  const previousUrl = provider[column];
  const stored = await validateAndStore(params.file);

  try {
    await prisma.provider.update({
      where: { id: provider.id },
      data: { [column]: stored.url },
    });
  } catch (err) {
    await unlinkMediaUrl(stored.url);
    throw err;
  }

  await unlinkMediaUrl(previousUrl);

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.MEDIA_UPLOAD,
    entityId: provider.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      field: column,
      url: stored.url,
      bytes: stored.bytes,
      mimeType: stored.mime,
      replacedPrevious: Boolean(previousUrl),
    },
  });

  return { url: stored.url, field: column };
}

export async function uploadProductImage(params: {
  productId: string;
  adminUserId: string;
  file: File;
  ipAddress?: string;
}): Promise<{ url: string; field: "imageUrl" }> {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
  });
  if (!product) {
    throw new MediaNotFoundError("Producto no encontrado");
  }
  if (product.scope !== ProductScope.GLOBAL) {
    throw new MediaValidationError(
      "id",
      "Usa la ruta de instancia del dueño para productos locales"
    );
  }

  assertRateLimit(`media-admin:${params.adminUserId}`, 20, 10 * 60 * 1000);

  const previousUrl = product.imageUrl;
  const stored = await validateAndStore(params.file);

  try {
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: stored.url },
    });
  } catch (err) {
    await unlinkMediaUrl(stored.url);
    throw err;
  }

  await unlinkMediaUrl(previousUrl);

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.MEDIA_UPLOAD,
    entityId: product.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: {
      field: "imageUrl",
      url: stored.url,
      bytes: stored.bytes,
      mimeType: stored.mime,
      replacedPrevious: Boolean(previousUrl),
    },
  });

  return { url: stored.url, field: "imageUrl" };
}

export async function uploadProviderProductImage(params: {
  userId: string;
  providerProductId: string;
  file: File;
  ipAddress?: string;
}): Promise<{ url: string; field: "imageUrl" }> {
  const provider = await prisma.provider.findUnique({
    where: { userId: params.userId },
  });
  if (!provider) {
    throw new MediaNotFoundError("Perfil de proveedor no encontrado");
  }

  const row = await prisma.providerProduct.findUnique({
    where: { id: params.providerProductId },
    include: { product: true },
  });
  if (!row) {
    throw new MediaNotFoundError("Producto no encontrado");
  }
  if (row.providerId !== provider.id) {
    throw new MediaForbiddenError();
  }

  assertRateLimit(`media:${provider.id}`, 20, 10 * 60 * 1000);

  const previousUrl = row.imageUrl;
  const stored = await validateAndStore(params.file);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.providerProduct.update({
        where: { id: row.id },
        data: { imageUrl: stored.url },
      });
      if (row.product.scope === ProductScope.LOCAL) {
        await tx.product.update({
          where: { id: row.productId },
          data: { imageUrl: stored.url },
        });
      }
    });
  } catch (err) {
    await unlinkMediaUrl(stored.url);
    throw err;
  }

  await unlinkMediaUrl(previousUrl);

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.MEDIA_UPLOAD,
    entityId: row.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      field: "imageUrl",
      url: stored.url,
      bytes: stored.bytes,
      mimeType: stored.mime,
      replacedPrevious: Boolean(previousUrl),
    },
  });

  return { url: stored.url, field: "imageUrl" };
}
