# LaBorregaMarket

Marketplace de fruterías, verdulerías y productos agrícolas — inspirado en la UX de Airbnb.

**Versión:** 0.4.0 (Fase 4 — reviews, geo, notify async, analytics)

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL 15+ |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Mapas | Google Maps JS (F4) + Leaflet fallback |
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

## Inicio rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 15+

### Instalación

```bash
cd LaBorregaMarket
npm install                  # postinstall ejecuta prisma generate
cp .env.example .env         # editar DATABASE_URL y JWT_SECRET
npx prisma migrate deploy
npm run db:seed
npm run dev                  # http://localhost:8080
```

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
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | F4 | Mapas (restringir por HTTP referrer en Google Cloud) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | F4 | Rate limit contacto (obligatorio en prod) |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | F4 | Jobs async (`/api/inngest`) |
| `WHATSAPP_*` | F4 | Notificaciones WA (opcional) |

Sin keys opcionales en local: degradación controlada (email no-op, maps deshabilitado, Redis in-memory).

## Seguridad en producción

- Rotar `JWT_SECRET`, `UPSTASH_*`, `INNGEST_*`, `WHATSAPP_*` por entorno.
- Restringir `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` por referrer (dominio + localhost).
- Cookie JWT: `secure: true` cuando `NODE_ENV=production`.
- No subir `.env` al repositorio; usar secret manager del hosting.
- Cuentas demo (`Demo1234!`) solo para dev/staging.

## Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/explorar` | Mapa + tarjetas (geo F4) | Público |
| `/fruteria/[id]` | Detalle + contacto | Público |
| `/carrito` | Checkout pickup | CLIENT |
| `/cuenta` | Perfil + direcciones | CLIENT |
| `/proveedor/*` | Catálogo, POS, órdenes, dashboard | PROVIDER |
| `/admin` | Catálogos, analytics, moderación reseñas | ADMIN |

## Scripts útiles

```bash
npm run build          # producción
npm run test           # Vitest
npm run db:migrate     # migraciones dev
npm run db:seed        # datos demo
```

## Licencia

Privado — LaBorregaMarket © 2026
