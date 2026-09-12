-- Fase 11: User 1:N Provider (ADR-034)
DROP INDEX IF EXISTS "providers_user_id_key";
CREATE INDEX IF NOT EXISTS "providers_user_id_idx" ON "providers"("user_id");
