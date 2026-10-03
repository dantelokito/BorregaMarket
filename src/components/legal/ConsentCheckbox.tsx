"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  children: ReactNode;
}

export const ConsentCheckbox = forwardRef<HTMLInputElement, ConsentCheckboxProps>(
  function ConsentCheckbox({ id, checked, onChange, disabled, error, children }, ref) {
    const errorId = `${id}-error`;
    return (
      <div aria-live="polite">
        <div className="flex min-h-11 items-start gap-3">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          />
          <label htmlFor={id} className="text-sm text-slate-700">
            {children}
          </label>
        </div>
        {error ? (
          <p id={errorId} className="mt-1 flex items-center gap-1 text-sm text-red-600">
            <AlertCircle size={14} aria-hidden />
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
