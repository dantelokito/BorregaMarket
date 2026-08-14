"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
  size?: number;
}

export function RatingStars({ value, onChange, readOnly, size = 22 }: RatingStarsProps) {
  return (
    <div className="inline-flex items-center gap-1" role={readOnly ? "img" : "radiogroup"} aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        if (readOnly) {
          return (
            <Star
              key={n}
              size={size}
              aria-hidden
              className={filled ? "text-amber-500" : "text-gray-300"}
              fill={filled ? "currentColor" : "none"}
            />
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            onClick={() => onChange?.(n)}
          >
            <Star
              size={size}
              className={filled ? "text-amber-500" : "text-gray-300"}
              fill={filled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}
