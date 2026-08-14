export const EMPTY_REVIEWS_COPY = "Sin reseñas todavía";
export const GOOGLE_REVIEWS_CTA = "Ver reseñas en Google";
export const VERIFICATION_REQUIRED = "Requiere verificación de tu negocio";

export function ratingDisplayLabel(rating: number, reviewCount: number): string {
  if (reviewCount === 0) return EMPTY_REVIEWS_COPY;
  return `${rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? "reseña" : "reseñas"})`;
}
