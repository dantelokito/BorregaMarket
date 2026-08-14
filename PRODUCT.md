# LaBorregaMarket — Product Overview

> **Versión del producto:** 0.2.0 (Fase 2 implementada; Fase 3 en discovery)  
> **Última actualización:** 12/08/2026  
> **Estado:** Pre-lanzamiento — F2 en cierre operativo; F3 pedidos/POS documentada  
> **Licencia:** Privado — LaBorregaMarket © 2026

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
│ Contactar directo│ Precios propios │ Bitácora y permisos        │
│ (próximo: pedidos)│ (próximo: pedidos)│ Analytics (roadmap)      │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## Usuarios y personas

### 1. María — Cliente (`CLIENT`)

- **Perfil:** 32 años, Monterrey. Compra frutas y verduras semanalmente.
- **Necesidad:** Encontrar fruterías cercanas con buen precio y productos frescos.
- **Journey objetivo:** Abrir app → explorar mapa → ver detalle de frutería → contactar o pedir.
- **Cuenta demo:** `cliente@demo.mx`

### 2. Carlos — Proveedor (`PROVIDER`)

- **Perfil:** Dueño de "Frutas El Paraíso", frutería en Centro Monterrey.
- **Necesidad:** Dar visibilidad a su negocio y gestionar qué productos ofrece y a qué precio.
- **Journey objetivo:** Registrarse → configurar negocio → activar productos del catálogo global → recibir contactos/pedidos.
- **Cuenta demo:** `frutas@elparaiso.mx`

### 3. Admin — Operador de plataforma (`ADMIN`)

- **Perfil:** Equipo interno de LaBorregaMarket.
- **Necesidad:** Gestionar catálogos, usuarios, permisos y auditar actividad.
- **Journey objetivo:** Login admin → revisar catálogos → verificar proveedores → consultar bitácora.
- **Cuenta demo:** `admin@laborregamarket.mx`

> **Password demo para todas las cuentas:** `Demo1234!`

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
| Mapas | Leaflet + OpenStreetMap |
| Validación | Zod |
| Iconos | lucide-react |

**Requisitos de ejecución:** Node.js 20+, PostgreSQL 15+

---

## Datos demo (seed)

### Proveedores en base de datos

| Negocio | Ubicación | Verificado |
|---------|-----------|------------|
| Frutas El Paraíso | Centro, Monterrey | ✅ |
| Campo Verde Frutería | San Pedro, Monterrey | ✅ |
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
- [ ] Cierre operativo: staging/CI, OBS-F2-003, OBS-F2-01, sign-off QA

### Fase 3 — Pedidos y operación del proveedor (v0.3.0)

- [ ] Checkout pickup in-app (`POST /api/orders`)
- [ ] POS software (venta de mostrador)
- [ ] Órdenes activas y transiciones de estado
- [ ] Dashboard de ventas ilustrativo
- [ ] Historial de pedidos en `/cuenta`
- [ ] Pago al recoger / efectivo POS (sin pasarela)

### Fase 4 — Confianza y escala (v0.4.0)

- [ ] Reseñas y ratings reales
- [ ] Filtro geográfico por radio
- [ ] Cola email Redis/worker + WhatsApp Business API
- [ ] Analytics admin de plataforma

### Fase 5 — Canales y monetización (v0.5.0)

- [ ] PWA / app móvil
- [ ] Pagos en línea (pasarela)
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
| 1 | Modelo de monetización | Comisión / suscripción / freemium | Pagos Fase 5 |
| 2 | Flujo de pedido | Contacto vs checkout | **F2 contacto; F3 Opción A: checkout pickup** |
| 3 | Verificación de proveedores | Manual vs documentos | Fase 4 si documentos |
| 4 | Alcance geográfico inicial | Monterrey vs NL | Radio F4; ciudades F5 |
| 5 | Catálogo global | Solo admin vs proveedor propone | Independiente de F3 |
| 6 | POS proveedor | Software en panel | **Cerrada: sí en F3** |

---

## Modelo open source

LaBorregaMarket adopta prácticas de documentación y transparencia del ecosistema open source:

| Práctica | Implementación en LaBorregaMarket |
|----------|-----------------------------------|
| README como punto de entrada | `README.md` — setup, stack, rutas |
| Product doc para stakeholders | Este archivo (`PRODUCT.md`) |
| Esquema como contrato | `prisma/schema.prisma` — fuente de verdad del dominio |
| Seed reproducible | `prisma/seed.ts` — demo consistente para QA y demos |
| Convenciones de contribución | Roadmap explícito, gaps documentados |
| Versionado semántico | `0.2.0` implementado; `0.3.0` en discovery PM |

**Nota:** El código es privado, pero la documentación de producto sigue el modelo de claridad, trazabilidad y reproducibilidad típico de proyectos OSS (CNCF, Mozilla, GitLab product handbook).

---

## Referencias internas

| Documento | Ubicación |
|-----------|-----------|
| Setup y desarrollo | `README.md` |
| Esquema de datos | `prisma/schema.prisma` |
| Datos demo | `prisma/seed.ts` |
| Variables de entorno | `.env.example` |
| Protección de rutas | `src/middleware.ts` |
| Permisos por módulo | `src/lib/auth/permissions.ts` |
| Índice PM (lectura mínima) | `Administrador de producto/Product Manager/outputs/laborregamarket/README.md` |
| Roadmap y fase activa | `.../laborregamarket/roadmap.md` y `.../laborregamarket/fase-3/` |

---

## Contacto del producto

**Producto:** LaBorregaMarket  
**Mercado inicial:** Monterrey, Nuevo León, México  
**Categoría:** Marketplace local · Agro / Retail fresco

---

*Documento generado para presentación a Product Management. Actualizar con cada release significativo.*
