-- Fase 13: archivo de oferta, unidad por sucursal, entradas e historial de precio (ADR-038)

ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "sale_unit" "ProductUnit";

CREATE INDEX IF NOT EXISTS "provider_products_provider_id_archived_at_idx"
  ON "provider_products"("provider_id", "archived_at");

DO $$ BEGIN
  CREATE TYPE "InventoryReceiveAs" AS ENUM ('CATALOG', 'BOX');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_entries" (
  "id" TEXT NOT NULL,
  "provider_product_id" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "receive_as" "InventoryReceiveAs" NOT NULL,
  "applied_delta" DECIMAL(12,3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_entries_provider_product_id_created_at_idx"
  ON "inventory_entries"("provider_product_id", "created_at");

ALTER TABLE "inventory_entries" DROP CONSTRAINT IF EXISTS "inventory_entries_provider_product_id_fkey";
ALTER TABLE "inventory_entries"
  ADD CONSTRAINT "inventory_entries_provider_product_id_fkey"
  FOREIGN KEY ("provider_product_id") REFERENCES "provider_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "provider_product_price_history" (
  "id" TEXT NOT NULL,
  "provider_product_id" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "previous_price" DECIMAL(10,2),
  "changed_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_product_price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "provider_product_price_history_provider_product_id_created_at_idx"
  ON "provider_product_price_history"("provider_product_id", "created_at");

ALTER TABLE "provider_product_price_history" DROP CONSTRAINT IF EXISTS "provider_product_price_history_provider_product_id_fkey";
ALTER TABLE "provider_product_price_history"
  ADD CONSTRAINT "provider_product_price_history_provider_product_id_fkey"
  FOREIGN KEY ("provider_product_id") REFERENCES "provider_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_product_price_history" DROP CONSTRAINT IF EXISTS "provider_product_price_history_changed_by_user_id_fkey";
ALTER TABLE "provider_product_price_history"
  ADD CONSTRAINT "provider_product_price_history_changed_by_user_id_fkey"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
