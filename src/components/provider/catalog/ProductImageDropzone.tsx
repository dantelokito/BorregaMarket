"use client";

import { MediaUpload } from "@/components/ui/MediaUpload";

export function ProductImageDropzone({
  label = "Foto",
  currentUrl,
  category,
  disabled,
  onUpload,
}: {
  label?: string;
  currentUrl: string | null;
  category?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<string>;
}) {
  return (
    <MediaUpload
      label={label}
      hint="JPEG, PNG o WebP · máx 5MB"
      variant="product"
      currentUrl={currentUrl}
      category={category}
      disabled={disabled}
      onUpload={onUpload}
    />
  );
}
