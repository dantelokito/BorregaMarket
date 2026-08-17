# LaBorregaMarket

Marketplace de fruterías, verdulerías y productos agrícolas — inspirado en la UX de Airbnb.

**Versión:** 0.5.0 (Fase 5 — Leaflet/OSM, catálogo inhabilitado, marca PROVIDER)

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL 15+ |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Mapas | Leaflet + teselas OSM (F5). Sin Google Maps JS en `/explorar` |
| Email | Resend (F2) |
| Media | Cloudinary (F2) |
| Rate limit | Upstash Redis (F4 prod) / in-memory (local) |
| Jobs async | Inngest + WhatsApp Cloud API (F4, opcional) |

## Funcionalidades por fase

| Fase | Entregables |
|------|-------------|
| F1–F2 | Auth, explorar, contacto, media, catálogo |
| F3 | Checkout pickup, carrito, POS proveedor, dashboard, órdenes activas |
| F4 | Reseñas, geo/radio/ETA, direcciones favoritas, analytics admin, notify async, báscula POS |
| F5 | Mapa Leaflet/OSM, productos inhabilitados fuera de canales de venta, colores de marca en sesión PROVIDER |

## Inicio rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 15+

### Instalación

```bash
cd LaBorregaMarket
npm install                  # postinstall ejecuta prisma generate
cp .env.example .env         # editar DATABASE_URL y JWT_SECRET
npx prisma migrate deploy    # incluye F5 add_provider_brand_colors
npm run db:seed
npm run dev                  # http://localhost:8080
```

En Windows: para `prisma generate` / `migrate`, detén `next dev` si el DLL del query engine está bloqueado.

### Cuentas demo (solo desarrollo)

| Email | Rol | Password |
|-------|-----|----------|
| admin@laborregamarket.mx | ADMIN | Demo1234! |
| frutas@elparaiso.mx | PROVIDER | Demo1234! |
| cliente@demo.mx | CLIENT | Demo1234! |

**No uses estas credenciales en producción.** Rota `JWT_SECRET` y desactiva o cambia el seed en staging/prod.

## Variables de entorno

Referencia completa en [`.env.example`](./.env.example). Nunca commitees `.env` con valores reales.

| Variable | Fase | Uso |
|----------|------|-----|
| `DATABASE_URL` | F1 | PostgreSQL |
| `JWT_SECRET` | F1 | Firma JWT (min 32 chars, único por entorno) |
| `NEXT_PUBLIC_APP_URL` | F2 | URL canónica (links email) |
| `RESEND_API_KEY`, `EMAIL_FROM` | F2 | Email contacto |
| `CLOUDINARY_*` | F2 | Upload imágenes |
| `NEXT_PUBLIC_OSM_TILE_URL` | F5 | Teselas OSM (opcional). Default: `tile.openstreetmap.org`. **No** se exige Maps JS key |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | F4 | Rate limit contacto (obligatorio en prod) |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | F4 | Jobs async (`/api/inngest`) |
| `WHATSAPP_*` | F4 | Notificaciones WA (opcional) |

Sin keys opcionales en local: degradación controlada (email no-op, Redis in-memory). `/explorar` renderiza Leaflet **sin** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. URL/Place ID de reseñas Google (F4) no usa el SDK JS.

## Seguridad en producción

- Rotar `JWT_SECRET`, `UPSTASH_*`, `INNGEST_*`, `WHATSAPP_*` por entorno.
- Teselas OSM: política OSMF o CDN en `NEXT_PUBLIC_OSM_TILE_URL`. Attribution en UI.
- Cookie JWT: `secure: true` cuando `NODE_ENV=production`.
- No subir `.env` al repositorio; usar secret manager del hosting.
- Cuentas demo (`Demo1234!`) solo para dev/staging.

## Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/explorar` | Mapa Leaflet/OSM + tarjetas (radio F4) | Público |
| `/fruteria/[id]` | Detalle + contacto (omite inactivos) | Público |
| `/carrito` | Checkout pickup | CLIENT |
| `/cuenta` | Perfil + direcciones | CLIENT |
| `/proveedor/*` | Catálogo, POS, órdenes, dashboard, colores | PROVIDER |
| `/admin` | Catálogos, analytics, moderación reseñas | ADMIN |
| `GET /api/auth/session` | Sesión + `brand` PROVIDER (tema CSS) | Público (200 invitado) |

## Scripts útiles

```bash
npm run build          # producción
npm run test           # Vitest
npm run db:migrate     # migraciones dev
npm run db:seed        # datos demo
```

## Licencia

Privado — LaBorregaMarket © 2026
