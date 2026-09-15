import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    provider: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("audit1"),
}));
vi.mock("@/lib/rate-limit/token-bucket", () => ({
  assertRateLimit: vi.fn(),
}));
vi.mock("@/lib/storage/local-disk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/local-disk")>(
    "@/lib/storage/local-disk"
  );
  return {
    ...actual,
    writeImageBuffer: vi.fn(),
    unlinkMediaUrl: vi.fn(),
  };
});

import { uploadProviderMedia } from "@/lib/services/media.service";
import { MAX_IMAGE_BYTES } from "@/lib/storage/local-disk";

function fileWithSize(size: number): File {
  return { size } as File;
}

describe("uploadProviderMedia size limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      logoUrl: null,
      coverUrl: null,
    });
  });

  it("rejects files over 20 MiB with the 20MB message", async () => {
    await expect(
      uploadProviderMedia({
        userId: "user1",
        field: "logo",
        file: fileWithSize(MAX_IMAGE_BYTES + 1),
      })
    ).rejects.toMatchObject({
      name: "MediaValidationError",
      field: "file",
      message: "El archivo supera el límite de 20MB",
    });
    expect(prismaMock.provider.update).not.toHaveBeenCalled();
  });

  it("does not reject on size when the file is exactly 20 MiB", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = {
      size: MAX_IMAGE_BYTES,
      arrayBuffer: async () =>
        jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength),
    } as File;

    const { writeImageBuffer } = await import("@/lib/storage/local-disk");
    vi.mocked(writeImageBuffer).mockResolvedValue({
      url: "/api/media/ok.jpg",
      bytes: MAX_IMAGE_BYTES,
      mime: "image/jpeg",
    });
    prismaMock.provider.update.mockResolvedValue({});

    await expect(
      uploadProviderMedia({
        userId: "user1",
        field: "logo",
        file,
      })
    ).resolves.toEqual({ url: "/api/media/ok.jpg", field: "logoUrl" });
  });
});
