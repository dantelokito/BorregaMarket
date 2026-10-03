import { z } from "zod";
import { LegalDocumentType, LegalPersonType } from "@prisma/client";

export const LEGAL_SLUG_TO_TYPE = {
  privacidad: LegalDocumentType.PRIVACY,
  terminos: LegalDocumentType.TERMS,
  cookies: LegalDocumentType.COOKIES,
} as const;

export type LegalSlug = keyof typeof LEGAL_SLUG_TO_TYPE;

export function legalTypeFromSlug(slug: string): LegalDocumentType | null {
  return Object.prototype.hasOwnProperty.call(LEGAL_SLUG_TO_TYPE, slug)
    ? LEGAL_SLUG_TO_TYPE[slug as LegalSlug]
    : null;
}

export const ACCEPT_TERMS_MESSAGE = "Debes aceptar los Términos para continuar";
export const STALE_VERSION_MESSAGE = "La versión ya no está vigente; recarga la página";

const RFC_PATTERN = /^[A-ZÑ&0-9]{12,13}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const legalPhoneSchema = z
  .string({ invalid_type_error: "Teléfono de 10 dígitos" })
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^\d{10}$/.test(v), "Teléfono de 10 dígitos");

export const putLegalSettingsSchema = z
  .object({
    personType: z.nativeEnum(LegalPersonType, {
      errorMap: () => ({ message: "Indica persona física o moral" }),
    }),
    legalName: z
      .string({ required_error: "Nombre o razón social requerido" })
      .trim()
      .min(2, "Mínimo 2 caracteres")
      .max(200, "Máximo 200 caracteres"),
    rfc: z
      .union([z.string().trim(), z.null()])
      .optional()
      .transform((v) => (v === undefined || v === null || v === "" ? null : v.toUpperCase())),
    address: z
      .string({ required_error: "Domicilio requerido" })
      .trim()
      .min(10, "Mínimo 10 caracteres")
      .max(300, "Máximo 300 caracteres"),
    arcoEmail: z
      .string({ required_error: "Correo ARCO requerido" })
      .trim()
      .max(254, "Máximo 254 caracteres")
      .email("Correo inválido"),
    phone: legalPhoneSchema,
    effectiveAt: z
      .string({ required_error: "Fecha de vigencia requerida" })
      .refine(isValidDateOnly, "Usa el formato AAAA-MM-DD"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.rfc === null) return;
    const expected = data.personType === LegalPersonType.MORAL ? 12 : 13;
    if (!RFC_PATTERN.test(data.rfc) || data.rfc.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rfc"],
        message: `RFC de ${expected} caracteres alfanuméricos`,
      });
    }
  });

export type PutLegalSettingsInput = z.infer<typeof putLegalSettingsSchema>;

export const createLegalDocumentSchema = z
  .object({
    type: z.nativeEnum(LegalDocumentType),
    title: z.string().trim().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
    content: z
      .string()
      .min(50, "Mínimo 50 caracteres")
      .max(100_000, "Máximo 100 000 caracteres"),
    effectiveAt: z
      .string()
      .datetime({ offset: true, message: "Fecha ISO inválida" })
      .refine(
        (v) => new Date(v).getTime() >= Date.now() - 60_000,
        "La vigencia no puede estar en el pasado"
      ),
  })
  .strict();

export type CreateLegalDocumentInput = z.infer<typeof createLegalDocumentSchema>;

export const legalDocumentTypeQuerySchema = z
  .union([z.nativeEnum(LegalDocumentType), z.literal(""), z.null()])
  .transform((v) => (v ? v : undefined));

const consentVersionSchema = z
  .number({ invalid_type_error: "Versión inválida", required_error: "Versión requerida" })
  .int("Versión inválida")
  .positive("Versión inválida");

/** Campos de aceptación en POST /api/auth/register (API-AUTH-15-01). */
export const registerConsentFields = {
  acceptLegal: z.literal(true, { errorMap: () => ({ message: ACCEPT_TERMS_MESSAGE }) }),
  termsVersion: consentVersionSchema,
  privacyVersion: consentVersionSchema,
};

/** Campos de aceptación en POST /api/providers (API-PROV-15-01). */
export const providerConsentFields = {
  acceptTerms: z.literal(true, { errorMap: () => ({ message: ACCEPT_TERMS_MESSAGE }) }),
  termsVersion: consentVersionSchema,
  whatsappOrderOptIn: z.boolean().default(false),
};

export const postConsentsSchema = z
  .object({
    documents: z
      .array(
        z
          .object({
            type: z.enum([LegalDocumentType.TERMS, LegalDocumentType.PRIVACY]),
            version: consentVersionSchema,
          })
          .strict()
      )
      .min(1, "Indica al menos un documento")
      .max(2, "Máximo 2 documentos")
      .refine(
        (docs) => new Set(docs.map((d) => d.type)).size === docs.length,
        "Documento repetido"
      ),
  })
  .strict();

export type PostConsentsInput = z.infer<typeof postConsentsSchema>;
