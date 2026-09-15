# LaBorregaMarket

Marketplace open source para **fruterías, verdulerías y productores agrícolas** en México. El objetivo es que un cliente encuentre negocio fresco cerca, compare y contacte o pida directo al proveedor — sin intermediarios.

**Versión:** 0.11.0 · Licencia [MIT](./LICENSE)

## Qué puedes hacer

| Quién | Qué ofrece la app |
|-------|-------------------|
| **Cliente** | Explorar en mapa (OpenStreetMap), filtrar por radio, ver horarios y reseñas, contactar o hacer pedido para recoger |
| **Proveedor** | Una o más sucursales por usuario, switcher si N>1, catálogo/POS/órdenes, reportes por sucursal y reportes generales |
| **Admin** | Curar el catálogo global, verificar negocios, moderar reseñas y ver analítica |

La sesión usa JWT en cookie **httpOnly** (`sub` + `role`). El activo de sucursal va en cookie **`lbm_active_provider`** (httpOnly). Las cuentas demo del seed **solo existen en desarrollo**.

## Inicio rápido

**Requisitos:** Node.js 20+ y PostgreSQL 15+.

```bash
git clone https://github.com/dantelokito/BorregaMarket.git
cd BorregaMarket
npm install
cp .env.example .env
```

En `.env` cambia `DATABASE_URL` y pon un `JWT_SECRET` de **al menos 32 caracteres**.

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre [http://localhost:8080](http://localhost:8080).

En Windows, detén `next dev` si `prisma generate` o `migrate` fallan (EPERM en el query engine). Tras pull F11: `npx prisma migrate deploy` **antes** de `npm run db:seed` (quita unique `Provider.userId`).

### Cuentas demo (solo local)

| Email | Rol | Password | Sucursales seed |
|-------|-----|----------|-----------------|
| admin@laborregamarket.mx | ADMIN | Demo1234! | — |
| frutas@elparaiso.mx | PROVIDER | Demo1234! | El Paraíso Centro + Tecnológico (N=2) |
| verduras@campoverde.mx | PROVIDER | Demo1234! | Campo Verde (N=1) |
| cliente@demo.mx | CLIENT | Demo1234! | — |

No uses estas credenciales en producción. El seed se niega a crearlas si `NODE_ENV=production` (salvo `ALLOW_DEMO_SEED=true`). Rota `JWT_SECRET` en cada entorno.

## Variables de entorno

Lista completa en [`.env.example`](./.env.example). **Nunca** subas un `.env` real al repositorio.

**Obligatorias para arrancar**

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` | Firma de sesión (mínimo 32 caracteres, único por entorno) |

**Recomendadas en producción**

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_APP_URL` | URL canónica (enlaces de email) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit de contacto, login y registro (obligatorio en prod) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email de contacto |
| `UPLOADS_DIR` | Media en disco (default `./uploads`; no Cloudinary Must) |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Jobs async (`/api/inngest`) |
| `WHATSAPP_*` | Notificaciones WhatsApp (opcional) |
| `NEXT_PUBLIC_OSM_TILE_URL` | Teselas del mapa. Vacío = OSM por defecto |

Sin las keys opcionales en local: email no-op, Redis en memoria. El mapa de `/explorar` no requiere API key de Google.

## Stack

Next.js 15, React 19, Tailwind CSS 4, Prisma 6, PostgreSQL 15+, JWT + bcrypt, Leaflet + OpenStreetMap.

## Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/explorar` | Mapa + tarjetas de negocios | Público |
| `/fruteria/[id]` | Detalle y contacto | Público |
| `/carrito` | Pedido para recoger | CLIENT |
| `/cuenta` | Perfil y direcciones | CLIENT |
| `/proveedor/*` | Catálogo, POS, órdenes, dashboard, reportes | PROVIDER |
| `/proveedor/reportes-generales` | Reportes consolidados (solo N>1) | PROVIDER |
| `/admin` | Catálogos, analítica, reseñas | ADMIN |

Visión de producto: [PRODUCT.md](./PRODUCT.md). Cómo contribuir: [CONTRIBUTING.md](./CONTRIBUTING.md). Vulnerabilidades: [SECURITY.md](./SECURITY.md).

## Scripts

```bash
npm run dev            # desarrollo, puerto 8080
npm run build          # build de producción
npm run start          # servir el build (puerto 8080)
npm run test           # Vitest
npm run lint           # ESLint
npm run db:migrate     # migraciones en desarrollo
npm run db:seed        # datos demo (bloqueado en producción)
```

## Licencia

[MIT](./LICENSE) © 2026 LaBorregaMarket contributors
