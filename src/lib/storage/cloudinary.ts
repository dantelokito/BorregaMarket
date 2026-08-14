import { v2 as cloudinary } from "cloudinary";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 5_242_880; // 5 MB

function ensureConfigured() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new CloudinaryConfigError();
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export class CloudinaryConfigError extends Error {
  constructor(message = "Cloudinary no configurado") {
    super(message);
    this.name = "CloudinaryConfigError";
  }
}

export function assertValidImage(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; field: string; message: string } {
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      field: "file",
      message: "Formato no permitido. Usa JPEG, PNG o WebP",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      field: "file",
      message: "El archivo supera el límite de 5MB",
    };
  }
  return { ok: true };
}

export async function uploadImageBuffer(params: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  mimeType: string;
}): Promise<{ url: string; publicId: string; bytes: number }> {
  ensureConfigured();

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: params.folder,
        public_id: params.publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Upload fallido"));
          return;
        }
        resolve({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          bytes: uploaded.bytes ?? params.buffer.length,
        });
      }
    );
    stream.end(params.buffer);
  });

  if (!result.secure_url.startsWith("https://")) {
    throw new Error("URL de Cloudinary inválida");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  };
}

/** Extrae public_id de una URL Cloudinary del mismo cloud, o null. */
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url) return null;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || !url.includes(`res.cloudinary.com/${cloud}/`)) {
    return null;
  }
  try {
    const u = new URL(url);
    // /<cloud>/image/upload/v123/folder/name.ext  or with transforms
    const match = u.pathname.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match?.[1]) return null;
    const withoutExt = match[1].replace(/\.[^/.]+$/, "");
    return withoutExt || null;
  } catch {
    return null;
  }
}

export async function destroyCloudinaryAsset(publicId: string): Promise<void> {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    // best-effort purge
  }
}
