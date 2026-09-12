const HTML_TAG = /<[^>]*>/;

export function hasHtml(value: string): boolean {
  return HTML_TAG.test(value);
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "producto";
}
