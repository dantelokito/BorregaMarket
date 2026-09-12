-- AlterTable providers (F7 preview vitrina)
ALTER TABLE "providers"
  ADD COLUMN "verified_at" TIMESTAMP(3),
  ADD COLUMN "opening_hours" JSONB,
  ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accepts_card_at_store" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "offers_wholesale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "offers_retail" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: negocios ya verificados sin fecha
UPDATE "providers"
SET "verified_at" = "updated_at"
WHERE "is_verified" = true AND "verified_at" IS NULL;
