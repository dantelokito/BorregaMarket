import {
  AuditAction,
  ConsentSource,
  LegalDocumentType,
  Prisma,
  SystemModule,
  type LegalSettings,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildMeta } from "@/lib/services/pagination";
import type { FieldError } from "@/lib/api/response";
import {
  STALE_VERSION_MESSAGE,
  type CreateLegalDocumentInput,
  type PutLegalSettingsInput,
} from "@/lib/validators/legal";

const SETTINGS_ID = 1;

export const REQUIRED_SETTINGS_FIELDS = [
  "personType",
  "legalName",
  "address",
  "arcoEmail",
  "phone",
  "effectiveAt",
] as const;

export const IN_UPDATE_TEXT = "en actualización";

export class LegalUnavailableError extends Error {
  constructor(message = "Registro temporalmente no disponible") {
    super(message);
    this.name = "LegalUnavailableError";
  }
}

export class LegalVersionError extends Error {
  constructor(public details: FieldError[]) {
    super("Validation failed");
    this.name = "LegalVersionError";
  }
}

export class LegalVersionConflictError extends Error {
  constructor(message = "Otra versión se publicó al mismo tiempo; reintenta") {
    super(message);
    this.name = "LegalVersionConflictError";
  }
}

export type CurrentLegalDocument = {
  id: string;
  type: LegalDocumentType;
  version: number;
  title: string;
  effectiveAt: Date;
};

type SettingsRow = Pick<
  LegalSettings,
  "personType" | "legalName" | "rfc" | "address" | "arcoEmail" | "phone" | "effectiveAt"
> & { updatedAt?: Date };

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export function computeMissingFields(row: SettingsRow | null): string[] {
  if (!row) return [...REQUIRED_SETTINGS_FIELDS];
  return REQUIRED_SETTINGS_FIELDS.filter((field) => {
    const value = row[field];
    return value === null || value === undefined || value === "";
  });
}

export function toPublicSettings(row: SettingsRow | null) {
  return {
    personType: row?.personType ?? null,
    legalName: row?.legalName ?? null,
    address: row?.address ?? null,
    arcoEmail: row?.arcoEmail ?? null,
    phone: row?.phone ?? null,
    effectiveAt: toDateOnly(row?.effectiveAt ?? null),
    isComplete: computeMissingFields(row).length === 0,
  };
}

export type PublicLegalSettings = ReturnType<typeof toPublicSettings>;

export function toAdminSettings(row: SettingsRow | null) {
  return {
    ...toPublicSettings(row),
    rfc: row?.rfc ?? null,
    missingFields: computeMissingFields(row),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

async function readSettingsRow(client: Pick<Prisma.TransactionClient, "legalSettings"> = prisma) {
  return client.legalSettings.findUnique({ where: { id: SETTINGS_ID } });
}

/** Vigente = mayor versión del type con effectiveAt <= now. */
export async function findCurrentDocument(
  type: LegalDocumentType,
  now: Date = new Date()
) {
  return prisma.legalDocument.findFirst({
    where: { type, effectiveAt: { lte: now } },
    orderBy: { version: "desc" },
  });
}

export async function findCurrentDocuments(
  now: Date = new Date()
): Promise<CurrentLegalDocument[]> {
  const rows = await prisma.legalDocument.findMany({
    where: { effectiveAt: { lte: now } },
    orderBy: [{ type: "asc" }, { version: "desc" }],
    distinct: ["type"],
    select: { id: true, type: true, version: true, title: true, effectiveAt: true },
  });
  return rows;
}

// ─── Lectura pública (server components: nunca lanza) ───────────────────────

export async function getPublicLegalSettings(): Promise<PublicLegalSettings | null> {
  try {
    return toPublicSettings(await readSettingsRow());
  } catch (err) {
    console.warn("[legal] settings_read_failed", err);
    return null;
  }
}

export async function getCurrentVersions(): Promise<CurrentLegalDocument[] | null> {
  try {
    return await findCurrentDocuments();
  } catch (err) {
    console.warn("[legal] versions_read_failed", err);
    return null;
  }
}

const PLACEHOLDERS: Record<string, (s: PublicLegalSettings | null) => string | null> = {
  "{{RESPONSABLE_NOMBRE}}": (s) => s?.legalName ?? null,
  "{{RESPONSABLE_DOMICILIO}}": (s) => s?.address ?? null,
  "{{CORREO_ARCO}}": (s) => s?.arcoEmail ?? null,
  "{{TELEFONO}}": (s) => s?.phone ?? null,
};

export function fillLegalPlaceholders(
  content: string,
  settings: PublicLegalSettings | null
): string {
  let out = content;
  for (const [token, pick] of Object.entries(PLACEHOLDERS)) {
    out = out.split(token).join(pick(settings) ?? IN_UPDATE_TEXT);
  }
  return out;
}

/**
 * Documento vigente con marcadores sustituidos, para `/legal/[slug]`.
 * `document: null` = "Documento en actualización". Errores de BD → ambos null.
 */
export async function getCurrentDocument(type: LegalDocumentType) {
  const settings = await getPublicLegalSettings();
  try {
    const doc = await findCurrentDocument(type);
    if (!doc) return { document: null, settings };
    return {
      document: {
        type: doc.type,
        version: doc.version,
        title: doc.title,
        effectiveAt: doc.effectiveAt.toISOString(),
        publishedAt: doc.publishedAt.toISOString(),
        content: fillLegalPlaceholders(doc.content, settings),
      },
      settings,
    };
  } catch (err) {
    console.warn("[legal] document_read_failed", err);
    return { document: null, settings };
  }
}

// ─── API-LEGAL-01 ────────────────────────────────────────────────────────────

export async function getLegalCurrentPayload() {
  const [row, documents] = await Promise.all([readSettingsRow(), findCurrentDocuments()]);
  return {
    settings: toPublicSettings(row),
    documents: documents.map((d) => ({
      type: d.type,
      version: d.version,
      title: d.title,
      effectiveAt: d.effectiveAt.toISOString(),
    })),
  };
}

// ─── API-LEGAL-02 / 03 ───────────────────────────────────────────────────────

export async function getAdminLegalSettings() {
  return toAdminSettings(await readSettingsRow());
}

export async function updateLegalSettings(params: {
  input: PutLegalSettingsInput;
  userId: string;
  ipAddress?: string;
}) {
  const { input } = params;
  const data = {
    personType: input.personType,
    legalName: input.legalName,
    rfc: input.rfc,
    address: input.address,
    arcoEmail: input.arcoEmail,
    phone: input.phone,
    effectiveAt: new Date(`${input.effectiveAt}T00:00:00.000Z`),
    updatedById: params.userId,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const before = await readSettingsRow(tx);
    const row = await tx.legalSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
    await writeAuditLog(
      {
        module: SystemModule.LEGAL,
        action: AuditAction.UPDATE,
        entityId: String(SETTINGS_ID),
        userId: params.userId,
        ipAddress: params.ipAddress,
        details: {
          before: before ? { ...toAdminSettings(before), updatedAt: undefined } : null,
          after: { ...toAdminSettings(row), updatedAt: undefined },
        },
      },
      tx
    );
    return row;
  });

  return toAdminSettings(updated);
}

// ─── API-LEGAL-04 / 05 ───────────────────────────────────────────────────────

function serializeDocument(d: {
  id: string;
  type: LegalDocumentType;
  version: number;
  title: string;
  effectiveAt: Date;
  publishedAt: Date;
}) {
  return {
    id: d.id,
    type: d.type,
    version: d.version,
    title: d.title,
    effectiveAt: d.effectiveAt.toISOString(),
    publishedAt: d.publishedAt.toISOString(),
  };
}

export async function publishLegalDocument(params: {
  input: CreateLegalDocumentInput;
  userId: string;
  ipAddress?: string;
}) {
  const { input } = params;
  try {
    const doc = await prisma.$transaction(async (tx) => {
      const last = await tx.legalDocument.aggregate({
        where: { type: input.type },
        _max: { version: true },
      });
      const version = (last._max.version ?? 0) + 1;
      const created = await tx.legalDocument.create({
        data: {
          type: input.type,
          version,
          title: input.title,
          content: input.content,
          effectiveAt: new Date(input.effectiveAt),
          createdById: params.userId,
        },
      });
      await writeAuditLog(
        {
          module: SystemModule.LEGAL,
          action: AuditAction.CREATE,
          entityId: created.id,
          userId: params.userId,
          ipAddress: params.ipAddress,
          details: { type: created.type, version: created.version },
        },
        tx
      );
      return created;
    });
    return serializeDocument(doc);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new LegalVersionConflictError();
    }
    throw err;
  }
}

export async function listLegalDocuments(
  filters: { type?: LegalDocumentType },
  pagination: { page: number; limit: number; skip: number }
) {
  const where: Prisma.LegalDocumentWhereInput = filters.type ? { type: filters.type } : {};
  const [rows, total] = await Promise.all([
    prisma.legalDocument.findMany({
      where,
      orderBy: [{ type: "asc" }, { version: "desc" }],
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        id: true,
        type: true,
        version: true,
        title: true,
        effectiveAt: true,
        publishedAt: true,
        _count: { select: { consents: true } },
      },
    }),
    prisma.legalDocument.count({ where }),
  ]);
  return {
    data: rows.map((r) => ({ ...serializeDocument(r), consentCount: r._count.consents })),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
}

// ─── Consentimientos (API-AUTH-15-01, API-PROV-15-01, API-CONSENT-15-01) ────

const VERSION_FIELD: Partial<Record<LegalDocumentType, string>> = {
  [LegalDocumentType.TERMS]: "termsVersion",
  [LegalDocumentType.PRIVACY]: "privacyVersion",
};

/**
 * Valida que cada versión declarada sea la vigente de su type.
 * Sin versión vigente → LegalUnavailableError (503); versión vieja → LegalVersionError (400).
 */
export async function resolveConsentDocuments(
  declared: { type: LegalDocumentType; version: number; field?: string }[]
): Promise<CurrentLegalDocument[]> {
  const current = await findCurrentDocuments();
  const byType = new Map(current.map((d) => [d.type, d]));
  const details: FieldError[] = [];
  const resolved: CurrentLegalDocument[] = [];
  for (const item of declared) {
    const doc = byType.get(item.type);
    if (!doc) throw new LegalUnavailableError();
    if (doc.version !== item.version) {
      details.push({
        field: item.field ?? VERSION_FIELD[item.type] ?? "version",
        message: STALE_VERSION_MESSAGE,
      });
      continue;
    }
    resolved.push(doc);
  }
  if (details.length > 0) throw new LegalVersionError(details);
  return resolved;
}

export function consentRows(
  userId: string,
  docs: CurrentLegalDocument[],
  source: ConsentSource
): Prisma.UserConsentCreateManyInput[] {
  return docs.map((d) => ({
    userId,
    documentId: d.id,
    documentType: d.type,
    version: d.version,
    source,
  }));
}

const RECONSENT_TYPES: LegalDocumentType[] = [LegalDocumentType.TERMS, LegalDocumentType.PRIVACY];

export async function getPendingConsents(userId: string) {
  const current = (await findCurrentDocuments()).filter((d) => RECONSENT_TYPES.includes(d.type));
  if (current.length === 0) return [];
  const accepted = await prisma.userConsent.findMany({
    where: { userId, documentId: { in: current.map((d) => d.id) } },
    select: { documentId: true },
  });
  const acceptedIds = new Set(accepted.map((a) => a.documentId));
  return current
    .filter((d) => !acceptedIds.has(d.id))
    .map((d) => ({ type: d.type, version: d.version, title: d.title }));
}

export async function acceptConsents(params: {
  userId: string;
  documents: { type: LegalDocumentType; version: number }[];
}) {
  const docs = await resolveConsentDocuments(
    params.documents.map((d, i) => ({ ...d, field: `documents.${i}.version` }))
  );
  await prisma.userConsent.createMany({
    data: consentRows(params.userId, docs, ConsentSource.RELOGIN),
    skipDuplicates: true,
  });
  return getPendingConsents(params.userId);
}
