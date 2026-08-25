/**
 * Produces a stable Vietnamese-insensitive search token for display data only.
 * It must not be used as an authorization identifier or persisted value.
 */
export function normalizeSearchText(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (/^[+\d\s().-]+$/.test(raw) && /\d/.test(raw)) {
    return raw.replace(/\D/g, '');
  }

  return raw
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[-–—‐―.,/\\_]+/g, ' ')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/g, ' ')
    .trim();
}

export function includesNormalizedSearch(value: unknown, query: unknown): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return !normalizedQuery || normalizeSearchText(value).includes(normalizedQuery);
}
