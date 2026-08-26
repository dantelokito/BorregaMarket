# Contribuir a LaBorregaMarket

Gracias por ayudar a mejorar el marketplace. Este documento cubre el flujo mínimo para contribuir.

## Requisitos

- Node.js 20+
- PostgreSQL 15+

## Setup local

```bash
git clone https://github.com/dantelokito/BorregaMarket.git
cd BorregaMarket
npm install
cp .env.example .env
```

Edita `.env` y define al menos `DATABASE_URL` y un `JWT_SECRET` de 32+ caracteres.

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

La app queda en [http://localhost:8080](http://localhost:8080).

## Checks antes de un PR

```bash
npm run lint
npm test
npm run build
```

## Pull requests

1. Crea una rama desde `main`.
2. Mantén el cambio enfocado (una preocupación por PR).
3. Incluye tests cuando toques auth, APIs o validación.
4. Describe el *por qué* en el PR, no solo el *qué*.

Las cuentas demo del seed son solo para desarrollo. No las uses en producción.

Para reportar una vulnerabilidad, sigue [SECURITY.md](./SECURITY.md).
