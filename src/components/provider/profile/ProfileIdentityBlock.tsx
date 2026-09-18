"use client";

import { MediaUpload } from "@/components/ui/MediaUpload";
import { BrandColorPicker } from "@/components/provider/BrandColorPicker";
import type { ProviderBusiness } from "@/lib/api/types";

export function ProfileIdentityBlock({
  business,
  onUpload,
}: {
  business: ProviderBusiness;
  onUpload: (field: "logo" | "cover", file: File) => Promise<string>;
}) {
  return (
    <section id="identidad" className="mb-8 space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Identidad visual</h2>
        <p className="text-sm text-slate-600">Logo, portada y colores de esta frutería.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <MediaUpload
          label="Logo"
          hint={business.logoUrl ? "JPEG, PNG o WebP · máx 5MB" : "Aún no subes un logo"}
          variant="logo"
          currentUrl={business.logoUrl}
          onUpload={(file) => onUpload("logo", file)}
        />
        <MediaUpload
          label="Portada"
          hint={business.coverUrl ? "JPEG, PNG o WebP · máx 5MB" : "Aún no subes una portada"}
          variant="cover"
          currentUrl={business.coverUrl}
          onUpload={(file) => onUpload("cover", file)}
        />
      </div>
      <BrandColorPicker
        skipLoad
        embedded
        initialPrimary={business.primaryColor}
        initialSecondary={business.secondaryColor}
      />
    </section>
  );
}
