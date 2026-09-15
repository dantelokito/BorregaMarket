# LaBorregaMarket — Product Overview

> **Versión del producto:** 0.12.0  
> **Última actualización:** 15/09/2026  
> **Estado:** Pre-lanzamiento — inventario blando Decimal por sucursal, User 1:N, media disco  
> **Licencia:** [MIT](./LICENSE)

---

## Resumen ejecutivo

**LaBorregaMarket** es un marketplace local que conecta clientes con fruterías, verdulerías y productores agrícolas en Monterrey. Ofrece una experiencia de descubrimiento inspirada en Airbnb: mapa interactivo, tarjetas de negocios y contacto directo con proveedores verificados.

El producto resuelve un problema concreto: **encontrar frutas y verduras frescas cerca, comparar opciones y contactar al negocio sin intermediarios**, mientras los proveedores gestionan su catálogo sobre un inventario global unificado.

---

## Problema

| Actor | Problema actual |
|-------|-----------------|
| **Cliente** | No existe una forma centralizada de explorar fruterías locales, comparar precios ni saber qué productos tiene cada negocio cerca de su ubicación. |
| **Proveedor** | Depende de WhatsApp, redes sociales o boca a boca. No tiene visibilidad digital estructurada ni un catálogo compartido con el resto del mercado. |
| **Operador / Admin** | Sin herramienta para curar el catálogo global, verificar negocios, auditar actividad ni gestionar permisos por rol. |

### Oportunidad

El mercado de productos frescos en México es masivo y fragmentado. Las fruterías locales compiten con supermercados y apps de delivery, pero **no tienen un marketplace dedicado** con UX moderna y modelo de catálogo compartido. LaBorregaMarket posiciona el descubrimiento local como ventaja: frescura, cercanía y relación directa con el negocio.

---

## Visión y misión

**Visión:** Ser la plataforma de referencia en Monterrey (y después en más ciudades) para descubrir, comparar y contactar negocios de frutas, verduras y productos agrícolas.

**Misión:** Conectar clientes con proveedores locales mediante una experiencia digital simple, segura y transparente — sin complicar la operación del negocio.

---

## Propuesta de valor

```
┌─────────────────────────────────────────────────────────────────┐
│                        LaBorregaMarket                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PARA CLIENTES │  PARA PROVEEDORES │      PARA ADMIN           │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Explorar en mapa│ Catálogo global │ Curar productos del sistema │
│ Comparar precios│ Activar/desactivar│ Verificar negocios         │
│ Contactar / pedir│ Precios y marca │ Bitácora y permisos        │
│ Radio + reseñas │ POS y dashboard │ Analytics de plataforma    │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## Usuarios y personas

### 1. María — Cliente (`CLIENT`)

- **Perfil:** 32 años, Monterrey. Compra frutas y verduras semanalmente.
- **Necesidad:** Encontrar fruterías cercanas con buen precio y productos frescos.
- **Journey objetivo:** Abrir app → explorar mapa → ver detalle de frutería → contactar o pedir.
- **Cuenta demo:** ver [README.md](./README.md) (solo entorno local)

### 2. Carlos — Proveedor (`PROVIDER`)

- **Perfil:** Dueño de "Frutas El Paraíso", frutería en Centro Monterrey.
- **Necesidad:** Dar visibilidad a su negocio y gestionar qué productos ofrece y a qué precio.
- **Journey objetivo:** Registrarse → configurar negocio → activar productos del catálogo global → recibir contactos/pedidos.
- **Cuenta demo:** ver [README.md](./README.md) (solo entorno local)

### 3. Admin — Operador de plataforma (`ADMIN`)

- **Perfil:** Equipo interno de LaBorregaMarket.
- **Necesidad:** Gestionar catálogos, usuarios, permisos y auditar actividad.
- **Journey objetivo:** Login admin → revisar catálogos → verificar proveedores → consultar bitácora.
- **Cuenta demo:** ver [README.md](./README.md) (solo entorno local)

---

## Alcance del producto (v0.1.0)

### En producción / implementado

| Capacidad | Descripción | Módulo |
|-----------|-------------|--------|
| Landing page | Hero, propuesta de valor, CTAs a explorar y registro | — |
| Explorar fruterías | Vista split: tarjetas + mapa Leaflet (OpenStreetMap) | — |
| Autenticación JWT | Login, registro, logout con cookie httpOnly | `AUTH` |
| Protección por roles | Middleware + guards en API | `PERMISSIONS` |
| Panel proveedor | Activar/desactivar productos del catálogo global | `PRODUCTS` |
| Panel admin | Vista de 7 catálogos del sistema (JSON) | Todos |
| Catálogo global | 15 productos (frutas, verduras, agrícolas) en DB | `PRODUCTS` |
| API de proveedores | Listado con filtros `city` y `q` | `PROVIDERS` |
| Bitácora parcial | Login, logout, registro, cambios de producto | `AUDIT` |
| RBAC en esquema | Matriz de permisos por rol y módulo en DB | `PERMISSIONS` |

### Diseñado en esquema, sin flujo completo

| Capacidad | Estado |
|-----------|--------|
| Pedidos (`Order`, `OrderItem`) | Modelo DB + vista admin; sin checkout ni API pública |
| Cuenta de cliente (`/cuenta`) | Referenciada en permisos; página no existe |
| Onboarding de proveedor | Registro crea `User` pero no `Provider` automáticamente |
| Ratings / reseñas | Campos en DB; valores estáticos del seed |

### Gaps conocidos (deuda de producto)

1. **Frontend desconectado del backend en explorar** — La página `/explorar` usa datos mock (`DEMO_PROVIDERS`); la API `/api/providers` ya existe pero no está integrada.
2. **6 proveedores en UI vs 3 en DB** — El mock del frontend muestra negocios que no existen en la base de datos.
3. **Filtros parciales** — Solo chips "verificado" y "frutas" funcionan en cliente; búsqueda del header es decorativa.
4. **Contacto** — Solo enlaces `tel:`; sin mensajería in-app ni notificaciones.

---

## Arquitectura de catálogos

Modelo central del producto: **un catálogo global administrado por la plataforma**, que cada proveedor personaliza con precio y disponibilidad.

```
┌─────────────────────────────────────────────────────────┐
│                    CATÁLOGO GLOBAL                       │
│  Productos (frutas, verduras, agrícolas) — solo ADMIN   │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   Proveedor A    Proveedor B    Proveedor C
   (precio +      (precio +      (precio +
    activo)        activo)        inactivo)
```

**Beneficio para el negocio:** El proveedor no crea productos desde cero; selecciona del catálogo curado y define su precio y stock.

**Beneficio para el cliente:** Comparabilidad — el mismo producto (ej. "Mango") existe en todos los negocios con precios distintos.

---

## Módulos del sistema

| Módulo | Descripción | CLIENT | PROVIDER | ADMIN |
|--------|-------------|--------|----------|-------|
| `USERS` | Cuentas de usuario | — | — | CRUD |
| `PROVIDERS` | Fruterías registradas | — | — | CRUD |
| `PRODUCTS` | Catálogo global | Ver | Ver + Editar | CRUD |
| `ORDERS` | Historial de pedidos | Ver + Crear | Ver + Crear | CRUD |
| `PERMISSIONS` | Control de acceso | — | — | CRUD |
| `AUTH` | Login / sesiones | Propio | Propio | CRUD |
| `AUDIT` | Bitácora de actividad | — | — | CRUD |

---

## Mapa de rutas

| Ruta | Descripción | Acceso | Estado |
|------|-------------|--------|--------|
| `/` | Landing page | Público | ✅ |
| `/explorar` | Mapa + tarjetas tipo Airbnb | Público | ✅ (mock data) |
| `/login` | Autenticación | Público | ✅ |
| `/registro` | Alta clientes / proveedores | Público | ✅ |
| `/proveedor` | Panel de productos del negocio | PROVIDER | ✅ |
| `/admin` | Catálogos, permisos, bitácora | ADMIN | ✅ |
| `/cuenta` | Área del cliente | CLIENT | 🔲 Planificado |
| `/fruteria/[id]` | Detalle de negocio | Público | 🔲 Planificado |

### API

| Método | Endpoint | Auth | Estado |
|--------|----------|------|--------|
| `POST` | `/api/auth/login` | Público | ✅ |
| `POST` | `/api/auth/register` | Público | ✅ |
| `POST` | `/api/auth/logout` | Opcional | ✅ |
| `GET` | `/api/providers` | Público | ✅ |
| `GET/PATCH` | `/api/provider/products` | PROVIDER | ✅ |
| `GET` | `/api/catalogs` | ADMIN | ✅ |
| — | `/api/orders` | CLIENT | 🔲 Planificado |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL 15+ |
| Autenticación | JWT (jsonwebtoken) + bcrypt |
| Mapas | Leaflet + teselas OpenStreetMap |
| Email | Resend |
| Media | Disco local (`UPLOADS_DIR`; Cloudinary no es Must) |
| Rate limit | Upstash Redis (prod) / in-memory (local) |
| Jobs async | Inngest (+ WhatsApp Cloud API opcional) |
| Validación | Zod |
| Iconos | lucide-react |

**Requisitos de ejecución:** Node.js 20+, PostgreSQL 15+

---

## Datos demo (seed)

### Proveedores en base de datos

| Negocio | Ubicación | Verificado |
|---------|-----------|------------|
| Frutas El Paraíso | Centro + Tecnológico (mismo usuario) | ✅ |
| Campo Verde Frutería | San Pedro (un usuario, N=1) | ✅ |
| La Borrega Agrícola | Santa Catarina | ❌ |

### Catálogo global (15 productos)

- **Frutas (7):** Mango, Plátano, Naranja, Fresa, Piña, Papaya, Uva
- **Verduras (5):** Tomate, Chile jalapeño, Cebolla, Lechuga, Zanahoria
- **Agrícolas (3):** Maíz, Frijol negro, Arroz

Cada proveedor tiene entradas `ProviderProduct` con variación de precio (~±10%) y disponibilidad aleatoria.

---

## Roadmap

### Fase 1 — MVP (v0.1.0)

- [x] Landing y explorar (UI + API)
- [x] Auth JWT + roles
- [x] Catálogo global + panel proveedor (precios editables)
- [x] Admin catálogos, verificación, bitácora
- [x] Detalle de frutería, onboarding proveedor, `/cuenta`

### Fase 2 — Contacto y presentación (v0.2.0)

- [x] Notificaciones email al proveedor (contacto)
- [x] Upload de imágenes (Cloudinary)
- [x] Filtros avanzados conectados al backend
- [ ] Cierre operativo: staging/CI (diferido)

### Fase 3 — Pedidos y operación del proveedor (v0.3.0)

- [x] Checkout pickup in-app (`POST /api/orders`)
- [x] POS software (venta de mostrador)
- [x] Órdenes activas y transiciones de estado
- [x] Dashboard de ventas
- [x] Historial de pedidos en `/cuenta`
- [x] Pago al recoger / efectivo POS (sin pasarela)

### Fase 4 — Confianza y escala (v0.4.0)

- [x] Reseñas y ratings reales
- [x] Filtro geográfico por radio (Haversine)
- [x] Cola email Inngest + Upstash Redis; WhatsApp Cloud API (Should)
- [x] Analytics admin de plataforma
- [x] Báscula POS (WebSerial, cliente)

### Fase 5 — Mapa OSM, catálogo y marca (v0.5.0)

- [x] Leaflet + teselas OSM en `/explorar` (sin Google Maps JS)
- [x] Producto inhabilitado omitido en canales de venta (409 al confirmar)
- [x] Colores de marca PROVIDER + tema en `GET /api/auth/session`

### Fases 6–10 — Operación, geo, admin y media disco

- [x] Pedidos, POS, dashboard, reportes por sucursal (F3/F10)
- [x] Explorar geo (Leaflet/OSM; pin URL F11)
- [x] Admin catálogo + flags; media en disco (`UPLOADS_DIR`)
- [x] CI GitHub: lint + Vitest + `next build` (sin postgres/Playwright en el YAML)

### Fase 11 — Multi-frutería y reportes generales (v0.11.0)

- [x] Relación User 1:N Provider (migración drop unique `userId`)
- [x] Cookie `lbm_active_provider` + switcher solo si N>1
- [x] `GET /api/provider/reports/global` (200 si N>1; 403 si N=1)
- [x] Seed El Paraíso ×2 + Campo Verde N=1
- [x] Explorar lista cards por Provider (honra `lat`/`lng` de URL)

### Fase 12 — Inventario blando (v0.12.0)

- [x] `on_hand` Decimal por sucursal; `stock` Int deprecado (no eliminado)
- [x] Alertas por umbral %, capacidad, factor caja
- [x] POS y catálogo leen inventario blando; `pos_show_images`
- [x] Ruta `/proveedor/inventario` y APIs `/api/provider/inventory`

### Fase 13+ — Canales y monetización

- [ ] PWA / app móvil
- [ ] Pagos en línea (pasarela)
- [ ] CFDI
- [ ] Comisión o suscripción (Decisión #1 abierta)
- [ ] Expansión a otras ciudades

---

## Métricas de éxito (propuesta)

| Métrica | Definición | Objetivo MVP |
|---------|------------|--------------|
| Proveedores activos | Negocios con `isActive` y productos disponibles | 10 en Monterrey |
| Conversión explorar → contacto | Clic en teléfono o detalle desde `/explorar` | > 15% |
| Productos activos por proveedor | Media de `ProviderProduct` con `isAvailable=true` | > 8 |
| Tiempo de onboarding proveedor | Registro → primer producto activo | < 10 min |
| Retención proveedor | Proveedores que actualizan catálogo en 30 días | > 60% |

---

## Decisiones de producto abiertas

| # | Decisión | Opciones | Impacto |
|---|----------|----------|---------|
| 1 | Modelo de monetización | Comisión / suscripción / freemium | Pagos F6+ |
| 2 | Flujo de pedido | Contacto vs checkout | **Cerrada: F2 contacto; F3 checkout pickup** |
| 3 | Verificación de proveedores | Manual vs documentos | Manual F4 (gate Google reseñas) |
| 4 | Alcance geográfico inicial | Monterrey vs NL | Radio F4; ciudades F6+ |
| 5 | Catálogo global | Solo admin vs proveedor propone | Independiente de F3 |
| 6 | POS proveedor | Software en panel | **Cerrada: sí en F3** |

---

## Modelo open source

LaBorregaMarket es un proyecto público con licencia MIT.

| Práctica | Dónde vive |
|----------|------------|
| Punto de entrada | `README.md` |
| Visión de producto | Este archivo (`PRODUCT.md`) |
| Cómo contribuir | `CONTRIBUTING.md` |
| Reportar vulnerabilidades | `SECURITY.md` |
| Esquema como contrato | `prisma/schema.prisma` |
| Seed reproducible (solo local) | `prisma/seed.ts` |
| Versionado | `0.12.0`; pagos y PWA en el roadmap |

---

## Referencias

| Documento | Ubicación |
|-----------|-----------|
| Setup y desarrollo | `README.md` |
| Esquema de datos | `prisma/schema.prisma` |
| Datos demo | `prisma/seed.ts` |
| Variables de entorno | `.env.example` |
| Protección de rutas | `src/middleware.ts` |
| Permisos por módulo | `src/lib/auth/permissions.ts` |

---

## Contacto del producto

**Producto:** LaBorregaMarket  
**Mercado inicial:** Monterrey, Nuevo León, México  
**Categoría:** Marketplace local · Agro / Retail fresco  
**Código:** [github.com/dantelokito/BorregaMarket](https://github.com/dantelokito/BorregaMarket)
