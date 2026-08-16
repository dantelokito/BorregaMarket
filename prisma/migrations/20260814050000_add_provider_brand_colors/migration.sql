-- AlterTable providers (F5 brand colors, ADR-021)
ALTER TABLE "providers"
  ADD COLUMN "primary_color" TEXT,
  ADD COLUMN "secondary_color" TEXT;
