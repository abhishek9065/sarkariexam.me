export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

export function uniqueSlug(base: string, suffix?: string | number): string {
  const slug = slugify(base);
  if (!suffix) return slug;
  return slugify(`${slug}-${suffix}`);
}
