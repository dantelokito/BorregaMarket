interface ImagePlaceholderProps {
  variant?: "cover" | "logo" | "product";
  category?: string;
  className?: string;
  label?: string;
}

const CATEGORY_ICON: Record<string, string> = {
  FRUTA: "🍎",
  VERDURA: "🥬",
  AGRICOLA: "🌾",
};

export function ImagePlaceholder({
  variant = "cover",
  category,
  className = "",
  label,
}: ImagePlaceholderProps) {
  const icon =
    variant === "product"
      ? CATEGORY_ICON[category ?? ""] ?? "🍊"
      : variant === "logo"
        ? "🍊"
        : "🏪";

  const sizeClass =
    variant === "logo"
      ? "h-24 w-24 rounded-full"
      : variant === "product"
        ? "h-12 w-12 rounded-lg"
        : "h-full w-full min-h-[120px]";

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 text-gray-500 ${sizeClass} ${className}`}
      role="img"
      aria-label={label ?? "Sin imagen"}
    >
      <span className={variant === "product" ? "text-xl" : "text-4xl"} aria-hidden>
        {icon}
      </span>
    </div>
  );
}
