# Seguridad

Si encuentras una vulnerabilidad en LaBorregaMarket, por favor **no** abras un issue público ni publiques un exploit.

## Cómo reportar

Usa [GitHub Security Advisories](https://github.com/dantelokito/BorregaMarket/security/advisories/new) para un reporte privado.

Incluye:

- Descripción del impacto
- Pasos para reproducir (sin payloads de ataque reutilizables si no son necesarios)
- Versión o commit afectado

Responderemos lo antes posible y coordinaremos una corrección antes de cualquier divulgación.

## Despliegue

- Nunca subas un archivo `.env` con secretos reales.
- En producción, `JWT_SECRET` debe ser único y de al menos 32 caracteres. La app se niega a arrancar la firma de tokens si falta o es el valor de desarrollo.
- Redis (Upstash) es obligatorio en producción para rate limit de contacto, login y registro.
- El seed de cuentas demo (`Demo1234!`) está bloqueado cuando `NODE_ENV=production`, salvo `ALLOW_DEMO_SEED=true`.
