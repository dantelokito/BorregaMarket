/** GLOBAL/LOCAL cannot publish with a invented default. Never `price ?? 50`. */
export function needsPriceToActivate(price: number | null | undefined, turningOn: boolean): boolean {
  if (!turningOn) return false;
  return price == null || price <= 0;
}

export function canPublishPrice(price: number | null | undefined): boolean {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}
