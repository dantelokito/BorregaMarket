# Observabilidad — LaBorregaMarket

> **Versión:** 0.14.0  
> **Fecha:** 18/09/2026  
> **Producto:** LaBorregaMarket (repo BorregaMarket)

## Runtime

| Ítem | Valor |
|------|--------|
| App | Next.js 15, puerto **8080** |
| CI | `.github/workflows/ci.yml` — lint, Vitest, `next build` (sin postgres ni Playwright) |
| Health HTTP dedicado | No hay `/api/health` Must; CI usa build + tests |

## Sesión (F11+)

| Cookie | Contenido | Flags |
|--------|-----------|--------|
| JWT vigente | `sub` + `role` | HttpOnly, Path `/`, SameSite=Lax, Secure en HTTPS |
| `lbm_active_provider` | cuid de sucursal | Iguales |

F14 no añade env Must. Inventario sigue Decimal (`on_hand`). Merma/ajuste aditivos: `InventoryEntry.kind` (`ENTRADA` / `MERMA` / `AJUSTE`). Media: `UPLOADS_DIR` (disco). Cloudinary no es Must.

## Logs y jobs

- Email / Inngest: degradación si faltan keys (ver `.env.example`).
- Rate limit: Upstash en prod; memoria en local.
- Uploads y `.env` no se versionan.

## Historial de versión de docs

| Versión | Nota |
|---------|------|
| 0.5.0 | Leaflet/OSM, marca PROVIDER |
| 0.10.x | Media disco, admin, reportes DASH (código en `main` vía PR #10) |
| 0.11.0 | User 1:N, cookie activa, reportes globales |
| 0.12.0 | Inventario blando Decimal por sucursal |
| 0.13.0 | Archivo de oferta, unidad, entradas, historial de precio |
| 0.14.0 | Panel PROVIDER: Perfil, merma aditiva, series SVG, PDF from/to |
