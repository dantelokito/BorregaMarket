import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/media/[filename]/route";
import { NextRequest } from "next/server";
import { detectImageMime, MAX_IMAGE_BYTES } from "@/lib/storage/local-disk";

function req() {
  return new NextRequest("http://localhost:8080/api/media/x");
}

describe("GET /api/media/[filename]", () => {
  it("rejects path traversal with 400", async () => {
    const res = await GET(req(), { params: Promise.resolve({ filename: "../secret.jpg" }) });
    expect(res.status).toBe(400);
  });

  it("rejects slash in filename with 400", async () => {
    const res = await GET(req(), {
      params: Promise.resolve({ filename: "a/b.jpg" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("MAX_IMAGE_BYTES", () => {
  it("allows up to 20 MiB", () => {
    expect(MAX_IMAGE_BYTES).toBe(20_971_520);
  });
});

describe("detectImageMime", () => {
  it("accepts JPEG magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageMime(buf)).toBe("image/jpeg");
  });

  it("rejects a fake jpeg (html body)", () => {
    const buf = Buffer.from("<html>not an image</html>");
    expect(detectImageMime(buf)).toBeNull();
  });
});
