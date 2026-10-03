import { apiGet, apiPost, apiPut } from "./client";

export type LegalDocType = "PRIVACY" | "TERMS" | "COOKIES";
export type LegalPersonType = "FISICA" | "MORAL";

export interface PublicLegalSettings {
  personType: LegalPersonType | null;
  legalName: string | null;
  address: string | null;
  arcoEmail: string | null;
  phone: string | null;
  effectiveAt: string | null;
  isComplete: boolean;
}

export interface LegalCurrentDocument {
  type: LegalDocType;
  version: number;
  title: string;
  effectiveAt: string;
}

export interface LegalCurrent {
  settings: PublicLegalSettings;
  documents: LegalCurrentDocument[];
}

export interface AdminLegalSettings extends PublicLegalSettings {
  rfc: string | null;
  missingFields: string[];
  updatedAt: string | null;
}

export interface PendingConsent {
  type: "TERMS" | "PRIVACY";
  version: number;
  title: string;
}

export interface PutLegalSettingsBody {
  personType: LegalPersonType;
  legalName: string;
  rfc: string | null;
  address: string;
  arcoEmail: string;
  phone: string;
  effectiveAt: string;
}

export function getLegalCurrent() {
  return apiGet<LegalCurrent>("/api/legal/current");
}

export function getAdminLegalSettings() {
  return apiGet<AdminLegalSettings>("/api/admin/legal/settings");
}

export function putAdminLegalSettings(body: PutLegalSettingsBody) {
  return apiPut<AdminLegalSettings>("/api/admin/legal/settings", body);
}

export function acceptConsents(documents: { type: "TERMS" | "PRIVACY"; version: number }[]) {
  return apiPost<{ pendingConsents: PendingConsent[] }>("/api/auth/consents", { documents });
}
