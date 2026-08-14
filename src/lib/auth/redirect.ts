/** BL-010: valida redirect param para evitar open redirects */
export function isValidRedirect(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes(":")) return false;
  return true;
}
