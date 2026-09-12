import { mkdir, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { existsSync, realpathSync } from "fs";

export const MAX_IMAGE_BYTES = 20_971_520; // 20 MiB

export class DiskStorageError extends Error {
  constructor(message = "No se pudo guardar la imagen") {
    super(message);
    this.name = "DiskStorageError";
  }
}

export type StoredImageMime = "image/jpeg" | "image/png" | "image/webp";

const FILENAME_RE = /^[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)$/i;
const MEDIA_URL_RE = /^\/api\/media\/([a-zA-Z0-9]+\.(jpg|jpeg|png|webp))$/i;

export function getUploadsDir(): string {
  const raw = process.env.UPLOADS_DIR?.trim() || "./uploads";
  return path.resolve(raw);
}

export function detectImageMime(buffer: Buffer): StoredImageMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function extForMime(mime: StoredImageMime): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function mimeFromExt(filename: string): StoredImageMime {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function assertSafeFilename(filename: string): string {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new MediaPathError();
  }
  if (!FILENAME_RE.test(filename)) {
    throw new MediaPathError();
  }
  return filename;
}

export class MediaPathError extends Error {
  constructor(message = "Nombre de archivo inválido") {
    super(message);
    this.name = "MediaPathError";
  }
}

export function mediaUrl(filename: string): string {
  return `/api/media/${filename}`;
}

export function filenameFromMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = MEDIA_URL_RE.exec(url);
  return match?.[1] ?? null;
}

export async function writeImageBuffer(params: {
  buffer: Buffer;
  mime: StoredImageMime;
}): Promise<{ filename: string; url: string; bytes: number }> {
  const dir = getUploadsDir();
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    throw new DiskStorageError("No se pudo guardar la imagen");
  }

  const filename = `${randomBytes(16).toString("hex")}.${extForMime(params.mime)}`;
  const finalPath = path.join(dir, filename);
  const tempPath = `${finalPath}.tmp`;

  try {
    await writeFile(tempPath, params.buffer);
    await rename(tempPath, finalPath);
  } catch {
    try {
      await unlink(tempPath);
    } catch {
      /* ignore */
    }
    throw new DiskStorageError("No se pudo guardar la imagen");
  }

  return { filename, url: mediaUrl(filename), bytes: params.buffer.length };
}

export async function unlinkMediaUrl(url: string | null | undefined): Promise<void> {
  const filename = filenameFromMediaUrl(url);
  if (!filename) return;
  const resolved = resolveMediaPath(filename);
  if (!resolved) return;
  try {
    await unlink(resolved);
  } catch {
    /* best-effort */
  }
}

export function resolveMediaPath(filename: string): string | null {
  try {
    assertSafeFilename(filename);
  } catch {
    return null;
  }
  const dir = getUploadsDir();
  const candidate = path.join(dir, filename);
  if (!existsSync(dir) || !existsSync(candidate)) return null;
  const dirReal = realpathSync(dir);
  const fileReal = realpathSync(candidate);
  if (!fileReal.startsWith(dirReal + path.sep) && fileReal !== dirReal) {
    return null;
  }
  return fileReal;
}
