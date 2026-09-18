-- Fase 14: merma/ajuste aditivos en InventoryEntry (ADR-040)

DO $$ BEGIN
  CREATE TYPE "InventoryEntryKind" AS ENUM ('ENTRADA', 'MERMA', 'AJUSTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryShrinkageReason" AS ENUM ('CADUCIDAD', 'DANO', 'ROBO', 'MUESTRA', 'OTRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "inventory_entries" ADD COLUMN IF NOT EXISTS "kind" "InventoryEntryKind" NOT NULL DEFAULT 'ENTRADA';
ALTER TABLE "inventory_entries" ADD COLUMN IF NOT EXISTS "on_hand_after" DECIMAL(12,3);
ALTER TABLE "inventory_entries" ADD COLUMN IF NOT EXISTS "reason" "InventoryShrinkageReason";
ALTER TABLE "inventory_entries" ADD COLUMN IF NOT EXISTS "note" VARCHAR(200);

ALTER TABLE "inventory_entries" ALTER COLUMN "receive_as" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "inventory_entries_kind_created_at_idx"
  ON "inventory_entries"("kind", "created_at");
