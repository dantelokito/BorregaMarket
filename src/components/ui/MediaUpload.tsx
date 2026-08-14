"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface MediaUploadProps {
  label: string;
  hint?: string;
  variant: "logo" | "cover" | "product";
  currentUrl: string | null;
  category?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<string>;
}

/** Bust Next.js / browser cache when Cloudinary overwrites same public_id */
function withCacheBust(url: string, version: number): string {
  if (version <= 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${version}`;
}

export function MediaUpload({
  label,
  hint,
  variant,
  currentUrl,
  category,
  disabled,
  onUpload,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreview(currentUrl);
    setImgError(false);
    setCacheVersion((v) => v + 1);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  function clearBlobPreview() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) {
      return "Formato no permitido. Usa JPEG, PNG o WebP";
    }
    if (file.size > MAX_BYTES) {
      return "El archivo supera el límite de 5MB";
    }
    return null;
  }

  async function handleFile(file: File) {
    setError("");
    const clientErr = validate(file);
    if (clientErr) {
      setError(clientErr);
      return;
    }

    clearBlobPreview();
    const localPreview = URL.createObjectURL(file);
    blobUrlRef.current = localPreview;
    setPreview(localPreview);
    setImgError(false);

    setUploading(true);
    try {
      const url = await onUpload(file);
      clearBlobPreview();
      setPreview(url);
      setCacheVersion((v) => v + 1);
      setImgError(false);
    } catch (err) {
      clearBlobPreview();
      setPreview(currentUrl);
      setImgError(false);
      if (err instanceof ApiError) {
        const detail = err.details?.[0]?.message;
        setError(detail ?? err.message);
      } else {
        setError("Error al subir la imagen");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const displayUrl = preview ?? currentUrl;
  const displaySrc = displayUrl ? withCacheBust(displayUrl, cacheVersion) : null;
  const isBlob = displayUrl?.startsWith("blob:") ?? false;

  const shapeClass =
    variant === "logo"
      ? "relative h-28 w-28 shrink-0 rounded-full"
      : variant === "product"
        ? "relative h-20 w-20 shrink-0 rounded-lg"
        : "relative aspect-[16/9] w-full max-w-xl rounded-xl";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-800">{label}</label>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>

      <div className={`overflow-hidden bg-gray-100 ${shapeClass}`}>
        {displaySrc && !imgError ? (
          variant === "cover" ? (
            <Image
              key={displaySrc}
              src={displaySrc}
              alt={label}
              fill
              unoptimized={isBlob}
              className="object-cover"
              sizes="576px"
              onError={() => setImgError(true)}
            />
          ) : (
            <Image
              key={displaySrc}
              src={displaySrc}
              alt={label}
              width={variant === "logo" ? 112 : 80}
              height={variant === "logo" ? 112 : 80}
              unoptimized={isBlob}
              className={`h-full w-full object-cover ${variant === "logo" ? "rounded-full" : "rounded-lg"}`}
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <ImagePlaceholder
            variant={variant === "product" ? "product" : variant}
            category={category}
            className="absolute inset-0 h-full w-full"
          />
        )}

        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <Loader2 className="animate-spin text-white" size={28} aria-hidden />
            <span className="sr-only">Subiendo…</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
        >
          <Upload size={16} aria-hidden />
          {displayUrl ? "Reemplazar" : "Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={label}
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
