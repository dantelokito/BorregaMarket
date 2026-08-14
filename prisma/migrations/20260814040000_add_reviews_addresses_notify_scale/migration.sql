-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterTable users (Should NOTIFY-08)
ALTER TABLE "users" ADD COLUMN "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable providers (F4 settings + ETA)
ALTER TABLE "providers"
  ADD COLUMN "preparation_time_minutes" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "offers_delivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "google_place_id" TEXT,
  ADD COLUMN "google_maps_url" TEXT,
  ADD COLUMN "google_reviews_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: seed estático deja de ser verdad de negocio
UPDATE "providers" SET "rating" = 0, "review_count" = 0;

-- CreateTable user_addresses
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "formatted_address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable orders (Should delivery + ETA snapshot)
ALTER TABLE "orders"
  ADD COLUMN "fulfillment_type" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "delivery_address_id" TEXT,
  ADD COLUMN "delivery_address_snapshot" JSONB,
  ADD COLUMN "eta_minutes" INTEGER;

ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "user_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable reviews
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

CREATE INDEX "reviews_provider_id_created_at_idx" ON "reviews"("provider_id", "created_at");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
