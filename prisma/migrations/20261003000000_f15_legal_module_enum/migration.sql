-- Fase 15 (ADR-042): valor LEGAL en SystemModule.
-- Va solo: PostgreSQL no permite usar un valor de enum en la misma transacción en que se agrega.

ALTER TYPE "SystemModule" ADD VALUE IF NOT EXISTS 'LEGAL';
