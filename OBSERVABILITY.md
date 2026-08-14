# OBSERVABILITY — LaBorregaMarket (Frontend Developer)

> Bitácora de implementación frontend: componentes, rutas, variables de entorno y ejecución.  
> **Fuente de verdad UX/UI:** `Agente UX UI/.../outputs/laborregamarket/OBSERVABILITY.md`

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **Producto** | LaBorregaMarket |
| **Versión frontend** | 0.2.0 (Fase 2) |
| **Fecha** | 10/08/2026 |
| **Agente** | Frontend Developer |
| **Estado fase** | ✅ Sprint 0 + F2-A/B/C (NOTIFY, MEDIA, EXPLORE) |
| **Código base** | `./` (repo LaBorregaMarket) |

---

## Librerías integradas

| Librería | Versión | Uso |
|----------|---------|-----|
| Next.js | 15 | App Router, Server Components, API routes |
| React | 19 | UI components |
| Tailwind CSS | 4 | Estilos utility-first |
| Leaflet + react-leaflet | 1.9 / 5 | Mapas explorar, detalle, onboarding |
| lucide-react | — | Iconografía |
| Inter (next/font) | — | Tipografía principal |

---

## Arquitectura de componentes

```
src/
├── lib/api/           # Capa API tipada (envelope { data, meta })
├── lib/auth/          # getServerSession, redirect, JWT
├── components/ui/     # Design system: Button, Input, EmptyState, Skeleton, ErrorBanner, UserMenu, StepIndicator
├── components/layout/ # Header (client) + HeaderWrapper (server)
├── components/explore/  # ProviderCard, FilterBar, ExploreMap
├── components/fruteria/ # ProviderHero, ProductTable, MiniMap, CallCTA
└── components/provider/ # OnboardingCTA, PriceInput
```

### Decisiones técnicas

| Decisión | Justificación |
|----------|---------------|
| `HeaderWrapper` server-side | Lee JWT de cookie sin endpoint `/api/auth/me` (D-UX cookie server-side) |
| `credentials: 'include'` en todos los fetch | Cookie `lbm_token` httpOnly requiere envío explícito |
| Filtros categoría client-side | API no expone filtro por categoría; keywords en `matchesCategoryFilter` |
| `PriceInput` inline con blur/Enter | OBS-04: edición precio sin modal, guardado por fila |
| Demo accounts gated por `NODE_ENV` | OBS-05: solo visible en desarrollo |
| Mapa móvil debajo de lista (300px) | OBS-01: cumple WF-explorar responsive |

---

## Variables de entorno (frontend)

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | No | Nombre de la app en UI | `LaBorregaMarket` |
| `NEXT_PUBLIC_APP_URL` | No | URL base para links absolutos | `http://localhost:3000` |
| `JWT_SECRET` | Sí (server) | Secreto JWT (min 32 chars) | `your-super-secret-key-min-32-chars` |
| `JWT_EXPIRES_IN` | No | Expiración del token | `7d` |
| `DATABASE_URL` | Sí (server) | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/laborregamarket` |

Referencia: [`.env.example`](./.env.example)

---

## Instrucciones de ejecución

```bash
cd ./LaBorregaMarket
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev    # http://localhost:3000
```

---

## Estructura de rutas (App Router)

| Ruta | Perfil | Componente | API |
|------|--------|------------|-----|
| `/` | Público | `page.tsx` | — |
| `/explorar` | Público | `ExplorePageClient` | `GET /api/providers` |
| `/fruteria/[id]` | Público | `FruteriaDetailClient` | `GET /api/providers/[id]` |
| `/login` | Público | `LoginPageClient` | `POST /api/auth/login` |
| `/registro` | Público | `RegisterPageClient` | `POST /api/auth/register` |
| `/registro/negocio` | PROVIDER | `BusinessOnboardingClient` | `POST /api/providers` |
| `/cuenta` | CLIENT | `CuentaPageClient` | `GET/PATCH /api/users/me` |
| `/proveedor` | PROVIDER | `ProveedorPageClient` | `GET /api/provider/me`, products |
| `/admin` | ADMIN | `AdminPageClient` | catalogs, providers, audit |

---

## Correcciones post-auditoría UX (OBS-01 a OBS-12)

| ID | Prioridad | Corrección aplicada |
|----|-----------|---------------------|
| OBS-01 | P0 | Mapa móvil visible debajo de lista (`h-[300px] lg:hidden`) |
| OBS-02 | P1 | ✅ Cerrado F2-C — chips → `GET /api/providers?category=` + URL sync |
| OBS-03 | P1 | Hint "Mínimo 8 caracteres" en login |
| OBS-04 | P0 | `PriceInput` editable inline en panel proveedor |
| OBS-05 | P1 | Cuentas demo ocultas en `NODE_ENV === 'production'` |
| OBS-06 | P1 | CLIENT redirige a `/` (mantiene `?redirect=`) |
| OBS-07 | P2 | `Button` con prop `loadingText` contextual |
| OBS-08 | P2 | Inputs deshabilitados durante loading en login |
| OBS-09 | P2 | Etiqueta de rol en dropdown UserMenu |
| OBS-10 | P2 | `EmptyState` + CTA Llamar en productos vacíos |
| OBS-11 | P2 | Link "Ver mi negocio →" en panel proveedor |
| OBS-12 | P2 | `StepIndicator` paso 1/2 en registro PROVIDER |

---

## Estados UI por pantalla

| Pantalla | Loading | Empty | Error | Success |
|----------|---------|-------|-------|---------|
| `/explorar` | SkeletonCard ×6 + mapa gris | EmptyState + limpiar filtros | ErrorBanner + retry | Grid + mapa (desktop y móvil) |
| `/fruteria/[id]` | Skeleton | EmptyState productos + CTA llamar | 404 / ErrorBanner | Hero + tabla + CTA |
| `/login` | "Ingresando..." + inputs disabled | — | Inline + aria-live | Redirect por rol |
| `/registro` | "Registrando..." | — | Inline + aria-live | Redirect |
| `/registro/negocio` | "Guardando..." | — | Inline + aria-live | → `/proveedor` |
| `/cuenta` | SkeletonForm | Pedidos placeholder | ErrorBanner | "Cambios guardados" |
| `/proveedor` | SkeletonTable | OnboardingCTA | ErrorBanner + inline fila | Toggle + precio editable ✓ |
| `/admin` | SkeletonTable | EmptyState | ErrorBanner | Tabs con datos |

---

## Perfiles soportados

| Perfil | Rol | Pantallas principales |
|--------|-----|----------------------|
| Clientes finales | `CLIENT` | Explorar, detalle frutería, cuenta |
| Fruterías / Negocios | `PROVIDER` | Onboarding, panel catálogo, ver negocio |
| Proveedores PyME | `PROVIDER` | Mismo flujo que fruterías |
| Operador plataforma | `ADMIN` | Panel admin (catálogos, proveedores, bitácora) |

---

## Handoff

**Estado: ENTERADO ✅**

Frontend v0.1.1 alineado con wireframes UX/UI y correcciones de auditoría. Listo para re-auditoría UX y pruebas integrales por @QA / Tester Senior.

---

*Actualizado por Frontend Developer — LaBorregaMarket v0.1.1.*
