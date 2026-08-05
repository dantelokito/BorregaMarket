# LaBorregaMarket 🍊

Marketplace de fruterías, verdulerías y productos agrícolas — inspirado en la UX de Airbnb.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Mapa | Leaflet + OpenStreetMap |

## Arquitectura de catálogos

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

### Módulos del sistema

| Módulo | Descripción | Visible para |
|--------|-------------|-------------|
| `USERS` | Cuentas de usuario | Solo ADMIN |
| `PROVIDERS` | Fruterías registradas | Solo ADMIN |
| `PRODUCTS` | Catálogo global | ADMIN + PROVEEDOR (activar/desactivar) |
| `ORDERS` | Historial de pedidos | ADMIN + roles propios |
| `PERMISSIONS` | Control de acceso | Solo ADMIN |
| `AUTH` | Login/sesiones | Todos (propio) |
| `AUDIT` | Bitácora | Solo ADMIN |

### Roles

| Rol | Acceso |
|-----|--------|
| **CLIENT** | Explorar fruterías, contactar, hacer pedidos |
| **PROVIDER** | Gestionar su negocio, activar/inactivar productos, ver pedidos |
| **ADMIN** | Catálogos completos, permisos, bitácora, usuarios |

## Inicio rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 15+

### Instalación

```bash
# 1. Clonar / entrar al proyecto
cd LaBorregaMarket

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL y JWT_SECRET

# 4. Crear base de datos y aplicar schema
npm run db:push

# 5. Sembrar datos demo
npm run db:seed

# 6. Iniciar desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Cuentas demo

| Email | Rol | Password |
|-------|-----|----------|
| admin@laborregamarket.mx | ADMIN | Demo1234! |
| frutas@elparaiso.mx | PROVIDER | Demo1234! |
| cliente@demo.mx | CLIENT | Demo1234! |

## Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page | Público |
| `/explorar` | Vista Airbnb (mapa + tarjetas) | Público |
| `/login` | Autenticación JWT | Público |
| `/registro` | Alta de clientes/proveedores | Público |
| `/proveedor` | Panel de productos del negocio | PROVIDER |
| `/admin` | Catálogos, permisos, bitácora | ADMIN |
| `/api/catalogs` | API de catálogos | ADMIN |
| `/api/provider/products` | Activar/desactivar productos | PROVIDER |

## API de autenticación

```bash
# Login — retorna JWT en cookie httpOnly + body
POST /api/auth/login
{ "email": "...", "password": "..." }

# Registro
POST /api/auth/register
{ "email": "...", "password": "...", "name": "...", "role": "CLIENT" }

# Logout
POST /api/auth/logout
```

El token JWT incluye: `sub` (userId), `email`, `role`, `name`.

## Próximos pasos

- [ ] Página de detalle de frutería (productos + contacto)
- [ ] Flujo de pedidos para clientes
- [ ] Upload de imágenes (Cloudinary/S3)
- [ ] Filtros avanzados conectados al backend
- [ ] Notificaciones WhatsApp/email al contactar
- [ ] Dashboard de analytics para admin

## Licencia

Privado — LaBorregaMarket © 2026
