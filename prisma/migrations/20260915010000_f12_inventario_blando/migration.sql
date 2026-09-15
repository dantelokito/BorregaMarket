-- Fase 12: inventario blando Decimal por sucursal (ADR-036 / ADR-037)
-- No se elimina ProviderProduct.stock (Int? deprecado).

ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "pos_show_images" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "capacity_max" DECIMAL(12,3);
ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "alert_threshold_percent" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "alert_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "provider_products" ADD COLUMN IF NOT EXISTS "box_content_factor" DECIMAL(12,3);

CREATE INDEX IF NOT EXISTS "provider_products_provider_id_idx" ON "provider_products"("provider_id");
CREATE INDEX IF NOT EXISTS "order_items_provider_product_id_idx" ON "order_items"("provider_product_id");
