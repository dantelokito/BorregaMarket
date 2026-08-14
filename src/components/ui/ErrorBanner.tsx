import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm text-red-700">
        <AlertCircle size={18} aria-hidden />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="shrink-0 py-1.5 text-xs">
          Reintentar
        </Button>
      )}
    </div>
  );
}
