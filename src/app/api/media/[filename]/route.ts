import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import {
  MediaPathError,
  assertSafeFilename,
  mimeFromExt,
  resolveMediaPath,
} from "@/lib/storage/local-disk";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  try {
    assertSafeFilename(filename);
  } catch (err) {
    if (err instanceof MediaPathError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const filePath = resolveMediaPath(filename);
  if (!filePath) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const bytes = await readFile(filePath);
  const mime = mimeFromExt(filename);
    return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
