-- Dual SKU (ADR-029) + ProviderSection (ADR-030) + instance imageUrl (ADR-032)

CREATE TYPE "ProductScope" AS ENUM ('GLOBAL', 'LOCAL');

ALTER TABLE "products"
  ADD COLUMN "scope" "ProductScope" NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN "owner_provider_id" TEXT;

ALTER TABLE "products" ALTER COLUMN "category" DROP NOT NULL;

DROP INDEX IF EXISTS "products_slug_key";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_slug_key";

CREATE UNIQUE INDEX "products_slug_global"
  ON "products" ("slug") WHERE "scope" = 'GLOBAL';

CREATE UNIQUE INDEX "products_slug_local"
  ON "products" ("owner_provider_id", "slug") WHERE "scope" = 'LOCAL';

CREATE INDEX "products_owner_provider_id_scope_idx"
  ON "products" ("owner_provider_id", "scope");

ALTER TABLE "products"
  ADD CONSTRAINT "products_owner_provider_id_fkey"
  FOREIGN KEY ("owner_provider_id") REFERENCES "providers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "provider_sections" (
  "id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_normalized" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_sections_provider_id_name_normalized_key"
  ON "provider_sections"("provider_id", "name_normalized");

CREATE INDEX "provider_sections_provider_id_sort_order_idx"
  ON "provider_sections"("provider_id", "sort_order");

ALTER TABLE "provider_sections"
  ADD CONSTRAINT "provider_sections_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_products"
  ADD COLUMN "section_id" TEXT,
  ADD COLUMN "image_url" TEXT;

ALTER TABLE "provider_products"
  ADD CONSTRAINT "provider_products_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "provider_sections"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
