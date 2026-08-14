-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('MARKETPLACE', 'POS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UNPAID', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('PZA', 'KG', 'GR');

-- AlterTable orders
ALTER TABLE "orders" DROP CONSTRAINT "orders_client_id_fkey";

ALTER TABLE "orders" ALTER COLUMN "client_id" DROP NOT NULL;

ALTER TABLE "orders" ADD COLUMN "customer_name" VARCHAR(80),
ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'MARKETPLACE',
ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "paid_at" TIMESTAMP(3),
ADD COLUMN "idempotency_key" TEXT;

ALTER TABLE "orders" ALTER COLUMN "source" DROP DEFAULT;

ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "orders_provider_id_idempotency_key_key" ON "orders"("provider_id", "idempotency_key");

CREATE INDEX "orders_provider_id_status_created_at_idx" ON "orders"("provider_id", "status", "created_at");

CREATE INDEX "orders_provider_id_created_at_idx" ON "orders"("provider_id", "created_at");

CREATE INDEX "orders_client_id_created_at_idx" ON "orders"("client_id", "created_at");

-- AlterTable order_items
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";

ALTER TABLE "order_items" DROP CONSTRAINT "order_items_provider_product_id_fkey";

ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "order_items" ALTER COLUMN "provider_product_id" DROP NOT NULL;

ALTER TABLE "order_items" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

ALTER TABLE "order_items" ADD COLUMN "item_name" VARCHAR(120) NOT NULL,
ADD COLUMN "unit_of_measure" "UnitOfMeasure" NOT NULL DEFAULT 'PZA';

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_provider_product_id_fkey" FOREIGN KEY ("provider_product_id") REFERENCES "provider_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_catalog_xor_custom" CHECK (
  (
    provider_product_id IS NOT NULL
    AND product_id IS NOT NULL
    AND char_length(trim(item_name)) > 0
  )
  OR
  (
    provider_product_id IS NULL
    AND product_id IS NULL
    AND char_length(trim(item_name)) > 0
    AND unit_price > 0
  )
);
