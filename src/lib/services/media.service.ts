import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  assertValidImage,
  uploadImageBuffer,
  extractCloudinaryPublicId,
  destroyCloudinaryAsset,
  CloudinaryConfigError,
} from "@/lib/storage/cloudinary";

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

export { CloudinaryConfigError };

async function fileToBuffer(file: File): Promise<Buffer> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab);
}

export async function uploadProviderMedia(params: {
  userId: string;
  field: "logo" | "cover";
  file: File;
  ipAddress?: string;
}): Promise<{ url: string; field: "logoUrl" | "coverUrl" }> {
  const check = assertValidImage({ type: params.file.type, size: params.file.size });
  if (!check.ok) {
    throw new MediaValidationError(check.field, check.message);
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: params.userId },
  });
  if (!provider) {
    throw new MediaNotFoundError("Perfil de proveedor no encontrado");
  }

  const column = params.field === "logo" ? "logoUrl" : "coverUrl";
  const previousUrl = provider[column];
  const buffer = await fileToBuffer(params.file);

  const uploaded = await uploadImageBuffer({
    buffer,
    folder: `laborregamarket/providers/${provider.id}`,
    publicId: params.field,
    mimeType: params.file.type,
  });

  await prisma.provider.update({
    where: { id: provider.id },
    data: { [column]: uploaded.url },
  });

  const prevPublicId = extractCloudinaryPublicId(previousUrl);
  if (prevPublicId && prevPublicId !== uploaded.publicId) {
    await destroyCloudinaryAsset(prevPublicId);
  }

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.MEDIA_UPLOAD,
    entityId: provider.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      field: column,
      url: uploaded.url,
      bytes: uploaded.bytes,
      mimeType: params.file.type,
      replacedPrevious: Boolean(previousUrl),
    },
  });

  return { url: uploaded.url, field: column };
}

export async function uploadProductImage(params: {
  productId: string;
  adminUserId: string;
  file: File;
  ipAddress?: string;
}): Promise<{ url: string; field: "imageUrl" }> {
  const check = assertValidImage({ type: params.file.type, size: params.file.size });
  if (!check.ok) {
    throw new MediaValidationError(check.field, check.message);
  }

  const product = await prisma.product.findUnique({
    where: { id: params.productId },
  });
  if (!product) {
    throw new MediaNotFoundError("Producto no encontrado");
  }

  const previousUrl = product.imageUrl;
  const buffer = await fileToBuffer(params.file);

  const uploaded = await uploadImageBuffer({
    buffer,
    folder: `laborregamarket/products/${product.id}`,
    publicId: "image",
    mimeType: params.file.type,
  });

  await prisma.product.update({
    where: { id: product.id },
    data: { imageUrl: uploaded.url },
  });

  const prevPublicId = extractCloudinaryPublicId(previousUrl);
  if (prevPublicId && prevPublicId !== uploaded.publicId) {
    await destroyCloudinaryAsset(prevPublicId);
  }

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.MEDIA_UPLOAD,
    entityId: product.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: {
      field: "imageUrl",
      url: uploaded.url,
      bytes: uploaded.bytes,
      mimeType: params.file.type,
      replacedPrevious: Boolean(previousUrl),
    },
  });

  return { url: uploaded.url, field: "imageUrl" };
}
