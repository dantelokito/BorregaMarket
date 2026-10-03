-- Fase 15 (ADR-042): datos del responsable, documentos legales versionados,
-- consentimientos y opt-in de WhatsApp del proveedor.

-- CreateEnum
CREATE TYPE "LegalPersonType" AS ENUM ('FISICA', 'MORAL');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('PRIVACY', 'TERMS', 'COOKIES');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('REGISTER', 'PROVIDER_ONBOARDING', 'RELOGIN');

-- AlterTable (sin backfill: los existentes quedan sin opt-in)
ALTER TABLE "providers" ADD COLUMN "whatsapp_order_opt_in" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsapp_order_opt_in_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "legal_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "person_type" "LegalPersonType",
    "legal_name" TEXT,
    "rfc" TEXT,
    "address" TEXT,
    "arco_email" TEXT,
    "phone" TEXT,
    "effective_at" DATE,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "legal_settings_single_row" CHECK ("id" = 1)
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_type" "LegalDocumentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_documents_type_effective_at_idx" ON "legal_documents"("type", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "user_consents_user_id_document_type_idx" ON "user_consents"("user_id", "document_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_document_id_source_key" ON "user_consents"("user_id", "document_id", "source");

-- AddForeignKey
ALTER TABLE "legal_settings" ADD CONSTRAINT "legal_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fila única del responsable (vacía: isComplete = false hasta que ADMIN la capture)
INSERT INTO "legal_settings" ("id", "updated_at") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Módulo RBAC LEGAL + permisos ADMIN (PROVIDER y CLIENT sin fila)
INSERT INTO "modules" ("id", "code", "name", "description", "is_active", "created_at")
VALUES ('mod_' || md5(random()::text || clock_timestamp()::text), 'LEGAL', 'Legal', 'Datos del responsable y documentos legales', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("id", "role", "module_id", "can_view", "can_create", "can_edit", "can_delete", "created_at", "updated_at")
SELECT 'rp_' || md5(random()::text || clock_timestamp()::text), 'ADMIN', m."id", true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "modules" m
WHERE m."code" = 'LEGAL'
ON CONFLICT ("role", "module_id") DO NOTHING;
