"use client";

import { CircleAlert } from "lucide-react";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";
import { ProfileIdentityBlock } from "@/components/provider/profile/ProfileIdentityBlock";
import { ProfileGoogleBlock } from "@/components/provider/profile/ProfileGoogleBlock";
import { ProfileBusinessForm } from "@/components/provider/profile/ProfileBusinessForm";
import { OpeningHoursEditor } from "@/components/provider/profile/OpeningHoursEditor";
import { ProfileCapabilitiesForm } from "@/components/provider/profile/ProfileCapabilitiesForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useProviderScope } from "@/hooks/useProviderScope";

export function ProfilePageClient() {
  const { activeName } = useProviderScope();
  const { business, loading, error, refetch, patch, uploadMedia } = useProviderProfile();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ActiveStoreEyebrow />
      <h1 className="text-2xl font-bold text-slate-900">Perfil{activeName ? ` — ${activeName}` : ""}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Identidad, Maps, datos y operación de esta sucursal.
      </p>

      {loading ? (
        <div className="mt-6 space-y-4" aria-busy="true" aria-label="Cargando perfil">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <EmptyState
            icon={<CircleAlert size={48} aria-hidden />}
            title="No pudimos cargar el perfil"
            description="Revisa la conexión. No inventamos datos del negocio."
            action={
              <Button type="button" className="min-h-11" onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : business ? (
        <div className="mt-6">
          <ProfileIdentityBlock business={business} onUpload={uploadMedia} />
          <ProfileGoogleBlock business={business} onSave={patch} />
          <ProfileBusinessForm business={business} onSave={patch} />
          <OpeningHoursEditor business={business} onSave={patch} />
          <ProfileCapabilitiesForm business={business} onSave={patch} />
        </div>
      ) : null}
    </div>
  );
}
