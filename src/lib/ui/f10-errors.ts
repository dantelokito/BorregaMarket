import { ApiError } from "@/lib/api/client";

export function mapF10ApiError(
  err: unknown,
  context: "module" | "business" = "business"
): string {
  if (!(err instanceof ApiError)) {
    return "Error de conexión";
  }
  if (err.status === 403) {
    return context === "module"
      ? "Sin permiso para este módulo"
      : "Esta vista es solo para tu negocio";
  }
  if (err.status === 409) {
    const slug = err.details?.some((d) => d.field === "slug");
    if (slug) return "Ya existe un producto con ese identificador";
    const section = err.message.toLowerCase().includes("sección");
    if (section) return "Mueve los productos a otra sección antes de eliminarla";
  }
  return err.message;
}

export function isDiskMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/media") || url.startsWith("blob:");
}
